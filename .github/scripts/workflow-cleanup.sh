#!/usr/bin/env bash
set -euo pipefail
trap 'rc=$?; echo "::error::workflow cleanup failed at line $LINENO: $BASH_COMMAND (exit $rc)"; exit "$rc"' ERR

repo="$GITHUB_REPOSITORY"
target_ref="$TARGET_REF"
current_run_id="$CURRENT_RUN_ID"
cleanup_path=".github/workflows/workflow-cleanup.yml"
update_path=".github/workflows/update-upw-plugin.yml"
request_path=".github/workflow-cleanup-request.json"
script_path=".github/scripts/workflow-cleanup.sh"
receipt_path=".ai-workflow/workflow-cleanup-receipt.json"
work="$RUNNER_TEMP/workflow-cleanup-batch"
mkdir -p "$work"
target_refs_json="$(jq -c '.target_refs // [.target_ref]' "$request_path")"
retained_paths_json="$(jq -c '.retained_workflow_paths' "$request_path")"
jq -e --arg cleanup "$cleanup_path" --arg update "$update_path" '. == [$cleanup,$update]' <<< "$retained_paths_json" >/dev/null
: > "$work/deleted-runs.tsv"
# The committed receipt is the cumulative history checkpoint across cleanup executions.
if [ -f "$receipt_path" ] && jq -e '(.initial_run_inventory | type == "array") and (.deletion_results | type == "array")' "$receipt_path" >/dev/null; then
  cp "$receipt_path" "$work/previous-receipt.json"
else
  printf '%s\n' '{"initial_run_inventory":[],"deletion_results":[],"deleted_workflows":[]}' > "$work/previous-receipt.json"
fi

api_retry() {
  local attempt=1 delay=2 out err rc
  out="$(mktemp)"; err="$(mktemp)"
  while [ "$attempt" -le 9 ]; do
    if "$@" >"$out" 2>"$err"; then
      cat "$out"; rm -f "$out" "$err"; return 0
    else rc=$?; fi
    if grep -Eqi 'HTTP (500|502|503|504)|HTTP 429|rate limit exceeded|secondary rate limit' "$err" && [ "$attempt" -lt 9 ]; then
      sleep "$delay"; delay=$((delay < 30 ? delay * 2 : 30)); attempt=$((attempt + 1)); continue
    fi
    cat "$err" >&2; rm -f "$out" "$err"; return "$rc"
  done
  cat "$err" >&2; rm -f "$out" "$err"; return 1
}

inventory_runs() {
  api_retry gh api --paginate --slurp "repos/$repo/actions/runs?per_page=100" > "$1"
}

# One complete workflow inventory, excluding cleanup and UPW run-history protection.
api_retry gh api --paginate --slurp "repos/$repo/actions/workflows?per_page=100" > "$work/workflows-pages.json"
jq -e 'length > 0 and all(.[]; has("workflows"))' "$work/workflows-pages.json" >/dev/null
jq -r --arg self "$cleanup_path" --arg update "$update_path" '[.[].workflows[] | select(.path != $self and .path != $update) | [.id,.name,.path] | @tsv] | .[]' \
  "$work/workflows-pages.json" > "$work/workflows.tsv"
: > "$work/targets.tsv"

while IFS=$'\t' read -r workflow_id workflow_name workflow_path; do
  [ -n "$workflow_id" ] || continue
  file_present=true
  if api_retry gh api "repos/$repo/contents/$workflow_path?ref=$target_ref" > "$work/content-$workflow_id.json" 2> "$work/content-$workflow_id.err"; then
    file_present=true
  else
    rc=$?
    if grep -Eqi 'HTTP 404|Not Found' "$work/content-$workflow_id.err"; then
      file_present=false
    else
      cat "$work/content-$workflow_id.err" >&2
      exit "$rc"
    fi
  fi
  rm -f "$work/content-$workflow_id.err"
  printf '%s\t%s\t%s\t%s\n' "$workflow_id" "$workflow_name" "$workflow_path" "$file_present" >> "$work/targets.tsv"
done < "$work/workflows.tsv"

target_ids="$(jq -Rn '[inputs | split("\t")[0] | tonumber]' < "$work/targets.tsv")"
# Union current definitions with every eligible non-cleanup, non-protected workflow ID
# found in repository-wide history, including stale YAML and non-default branches.
inventory_runs "$work/run-id-discovery.json"
cleanup_workflow_id="$(jq -r --arg cleanup "$cleanup_path" '[.[].workflows[] | select(.path == $cleanup) | .id][0] // empty' "$work/workflows-pages.json")"
if [ -n "$cleanup_workflow_id" ]; then
  run_workflow_ids="$(jq -c --arg cleanup "$cleanup_path" --arg update "$update_path" '[.[].workflow_runs[] | select(.workflow_id != null and .path != null and .path != $cleanup and .path != $update) | .workflow_id] | unique' "$work/run-id-discovery.json")"
else
  run_workflow_ids="$(jq -c --arg cleanup "$cleanup_path" --arg update "$update_path" '[.[].workflow_runs[] | select(.workflow_id != null and .path != null and .path != $cleanup and .path != $update) | .workflow_id] | unique' "$work/run-id-discovery.json")"
fi
target_ids="$(jq -n --argjson ids "$target_ids" --argjson from_runs "$run_workflow_ids" '$ids + $from_runs | unique')"
jq -Rn '[inputs | split("\t") | {workflow_id:(.[0]|tonumber),workflow_name:.[1],workflow_path:.[2],yaml_present:(.[3]=="true")}]' \
  < "$work/targets.tsv" > "$work/target-workflows-current.json"
jq -n --arg cleanup "$cleanup_path" --arg update "$update_path" --slurpfile current "$work/target-workflows-current.json" --slurpfile runs "$work/run-id-discovery.json" \
  '($current[0] + ([$runs[0][].workflow_runs[] | select(.workflow_id != null and .path != null and .path != $cleanup and .path != $update) | {workflow_id:.workflow_id,workflow_name:(.name // "stale workflow"),workflow_path:.path,yaml_present:false}] | unique_by(.workflow_id))) | unique_by(.workflow_id)' \
  > "$work/target-workflows.json"

# Workflow definitions and enabled states are durable configuration, not run history.
# Do not disable or delete workflow producers during history cleanup. Active runs are
# drained below by exact run ID; definitions remain present and enabled.

cancel_batch() {
  local input="$1"
  cut -f1 "$input" | while read -r id; do [ -n "$id" ] && printf '%s\0' "$id"; done |
    xargs -0 -r -P 8 -n 1 bash -c '
      id="$1"; repo="$GITHUB_REPOSITORY"; err="$(mktemp)"; delay=2
      for attempt in 1 2 3 4 5 6 7 8 9; do
        if gh api --method POST "repos/$repo/actions/runs/$id/cancel" >/dev/null 2>"$err"; then
          rm -f "$err"; exit 0
        fi
        if grep -Eqi "HTTP (404|409|422)|Not Found|already completed|cannot be cancelled" "$err"; then
          rm -f "$err"; exit 0
        fi
        if grep -Eqi "HTTP (500|502|503|504)|HTTP 429|rate limit exceeded|secondary rate limit" "$err"; then
          sleep "$delay"; delay=$((delay < 30 ? delay * 2 : 30)); continue
        fi
        cat "$err" >&2; rm -f "$err"; exit 1
      done
      cat "$err" >&2; rm -f "$err"; exit 1
    ' _ 
}

delete_batch() {
  local input="$1" output="$2"
  cut -f1 "$input" | while read -r id; do [ -n "$id" ] && printf '%s\0' "$id"; done |
    xargs -0 -r -P 8 -n 1 bash -c '
      id="$1"; repo="$GITHUB_REPOSITORY"; err="$(mktemp)"; delay=2
      for attempt in 1 2 3 4 5 6 7 8 9; do
        if gh api --method DELETE "repos/$repo/actions/runs/$id" >/dev/null 2>"$err"; then
          printf "DELETED\t%s\n" "$id"; rm -f "$err"; exit 0
        fi
        if grep -Eqi "HTTP 404|Not Found" "$err"; then
          printf "ALREADY_ABSENT\t%s\n" "$id"; rm -f "$err"; exit 0
        fi
        if grep -Eqi "HTTP (500|502|503|504)|HTTP 429|rate limit exceeded|secondary rate limit" "$err"; then
          sleep "$delay"; delay=$((delay < 30 ? delay * 2 : 30)); continue
        fi
        cat "$err" >&2; rm -f "$err"; exit 1
      done
      cat "$err" >&2; rm -f "$err"; exit 1
    ' _ > "$output"
}

# Drain and delete all non-cleanup runs in bounded concurrent batches.
for round in 1 2 3 4 5 6; do
  inventory_runs "$work/runs-before-$round.json"
  jq -r --argjson ids "$target_ids" --argjson protected "$current_run_id" \
    '[.[].workflow_runs[] | select(.workflow_id as $id | ($ids|index($id)) != null) | select(.id != $protected) | select(.status != "completed") | [.id,.workflow_id,.status] | @tsv] | .[]' \
    "$work/runs-before-$round.json" > "$work/active-$round.tsv"
  if [ -s "$work/active-$round.tsv" ]; then
    cancel_batch "$work/active-$round.tsv"
    drained=false
    for poll in $(seq 1 120); do
      sleep 10
      inventory_runs "$work/runs-poll.json"
      jq -r --argjson ids "$target_ids" --argjson protected "$current_run_id" \
        '[.[].workflow_runs[] | select(.workflow_id as $id | ($ids|index($id)) != null) | select(.id != $protected) | select(.status != "completed") | [.id,.workflow_id,.status] | @tsv] | .[]' \
        "$work/runs-poll.json" > "$work/active-poll.tsv"
      if [ ! -s "$work/active-poll.tsv" ]; then drained=true; break; fi
      cancel_batch "$work/active-poll.tsv"
    done
    [ "$drained" = "true" ] || { echo "::error::Active target runs did not drain"; exit 1; }
  fi

  jq -r --argjson ids "$target_ids" --argjson protected "$current_run_id" \
    '[.[].workflow_runs[] | select(.workflow_id as $id | ($ids|index($id)) != null) | select(.id != $protected) | select(.status == "completed") | [.id,.workflow_id,.run_attempt,.head_sha,.head_branch,.event] | @tsv] | .[]' \
    "$work/runs-before-$round.json" > "$work/completed-$round.tsv"
  if [ -s "$work/completed-$round.tsv" ]; then
    delete_batch "$work/completed-$round.tsv" "$work/delete-results-$round.tsv"
    cat "$work/delete-results-$round.tsv" >> "$work/deleted-runs.tsv"
  fi

  inventory_runs "$work/runs-after-$round.json"
  remaining="$(jq --argjson ids "$target_ids" --argjson protected "$current_run_id" \
    '[.[].workflow_runs[] | select(.workflow_id as $id | ($ids|index($id)) != null) | select(.id != $protected)] | length' \
    "$work/runs-after-$round.json")"
  [ "$remaining" -eq 0 ] && break
done

inventory_runs "$work/final-runs.json"
remaining="$(jq --argjson ids "$target_ids" --argjson protected "$current_run_id" \
  '[.[].workflow_runs[] | select(.workflow_id as $id | ($ids|index($id)) != null) | select(.id != $protected)] | length' \
  "$work/final-runs.json")"
[ "$remaining" -eq 0 ] || { echo "::error::$remaining non-cleanup runs remain"; exit 1; }

# The cleanup workflow is also in scope: retain only this exact run as the report carrier.
[ -n "$cleanup_workflow_id" ] || { echo "::error::Cleanup workflow ID was not found"; exit 1; }
inventory_runs "$work/self-runs-before.json"
jq -e --argjson current "$current_run_id" --argjson cleanup "$cleanup_workflow_id" \
  'any(.[].workflow_runs[]; .id == $current and .workflow_id == $cleanup)' \
  "$work/self-runs-before.json" >/dev/null

jq -r --argjson cleanup "$cleanup_workflow_id" --argjson current "$current_run_id" \
  '[.[].workflow_runs[] | select(.workflow_id == $cleanup and .id != $current) | select(.status != "completed") | [.id,.workflow_id,.status] | @tsv] | .[]' \
  "$work/self-runs-before.json" > "$work/self-active.tsv"
if [ -s "$work/self-active.tsv" ]; then
  cancel_batch "$work/self-active.tsv"
  self_drained=false
  for poll in $(seq 1 120); do
    sleep 10
    inventory_runs "$work/self-runs-poll.json"
    jq -r --argjson cleanup "$cleanup_workflow_id" --argjson current "$current_run_id" \
      '[.[].workflow_runs[] | select(.workflow_id == $cleanup and .id != $current) | select(.status != "completed") | [.id,.workflow_id,.status] | @tsv] | .[]' \
      "$work/self-runs-poll.json" > "$work/self-active-poll.tsv"
    if [ ! -s "$work/self-active-poll.tsv" ]; then self_drained=true; break; fi
    cancel_batch "$work/self-active-poll.tsv"
  done
  [ "$self_drained" = "true" ] || { echo "::error::Historical cleanup runs did not drain"; exit 1; }
fi

inventory_runs "$work/self-runs-delete.json"
jq -r --argjson cleanup "$cleanup_workflow_id" --argjson current "$current_run_id" \
  '[.[].workflow_runs[] | select(.workflow_id == $cleanup and .id != $current) | select(.status == "completed") | [.id,.workflow_id,.run_attempt,.head_sha,.head_branch,.event] | @tsv] | .[]' \
  "$work/self-runs-delete.json" > "$work/self-completed.tsv"
if [ -s "$work/self-completed.tsv" ]; then
  delete_batch "$work/self-completed.tsv" "$work/self-delete-results.tsv"
  cat "$work/self-delete-results.tsv" >> "$work/deleted-runs.tsv"
fi

self_clean=false
for verify_poll in $(seq 1 12); do
  inventory_runs "$work/final-runs.json"
  self_remaining="$(jq --argjson cleanup "$cleanup_workflow_id" --argjson current "$current_run_id" \
    '[.[].workflow_runs[] | select(.workflow_id == $cleanup and .id != $current)] | length' \
    "$work/final-runs.json")"
  if [ "$self_remaining" -eq 0 ] && jq -e --argjson current "$current_run_id" --arg cleanup "$cleanup_path" --arg update "$update_path" \
    'any(.[].workflow_runs[]; .id == $current and .path == $cleanup) and all(.[].workflow_runs[]; .id == $current or .path == $update)' \
    "$work/final-runs.json" >/dev/null; then
    self_clean=true
    break
  fi
  sleep 5
done
[ "$self_clean" = "true" ] || { echo "::error::Cleanup workflow run inventory did not converge to exactly the current report run"; exit 1; }

# Build a complete initial run ledger, including cleanup-workflow runs.
jq -n --slurpfile initial "$work/runs-before-1.json" --slurpfile self "$work/self-runs-before.json" \
  '([ $initial[0][].workflow_runs[] ] + [ $self[0][].workflow_runs[] ])
   | unique_by(.id)
   | map({run_id:.id,workflow_id:.workflow_id,workflow_name:.name,workflow_path:.path,attempt:.run_attempt,head_sha:.head_sha,branch:.head_branch,event:.event,status:.status,conclusion:.conclusion,created_at:.created_at,updated_at:.updated_at})' \
  > "$work/initial-run-ledger.json"
jq -Rn '[inputs | split("\t") | {result:.[0],run_id:(.[1]|tonumber)}]' \
  < "$work/deleted-runs.tsv" > "$work/deletion-results.json"

# Merge prior receipts with this execution by stable run/workflow IDs. This preserves
# the complete cleanup campaign ledger when the prior report run is deleted.
jq -n --slurpfile previous "$work/previous-receipt.json" --slurpfile current "$work/initial-run-ledger.json" \
  '([($previous[0].initial_run_inventory // [])[]] + $current[0]) | unique_by(.run_id)' \
  > "$work/cumulative-run-ledger.json"
jq -n --slurpfile previous "$work/previous-receipt.json" --slurpfile current "$work/deletion-results.json" \
  '([($previous[0].deletion_results // [])[]] + $current[0]) | unique_by(.run_id)' \
  > "$work/cumulative-deletion-results.json"
jq -n --slurpfile previous "$work/previous-receipt.json" --slurpfile current "$work/target-workflows.json" \
  '([($previous[0].deleted_workflows // [])[]] + $current[0])
   | group_by(.workflow_path)
   | map({
       workflow_id:(map(.workflow_id | select(. != null))|first // null),
       workflow_name:(map(.workflow_name // empty)|first // "stale workflow"),
       workflow_path:(map(.workflow_path // empty)|first // "unknown"),
       yaml_present:any(.[]; .yaml_present == true)
   })' > "$work/cumulative-workflows.json"

jq -n --slurpfile definitions "$work/workflows-pages.json" --slurpfile workflows "$work/cumulative-workflows.json" \
  --slurpfile initial "$work/cumulative-run-ledger.json" --slurpfile final "$work/final-runs.json" \
  --slurpfile deleted "$work/cumulative-deletion-results.json" \
  '([ $definitions[0][].workflows[] | {workflow_id:.id,workflow_name:.name,workflow_path:.path} ] +
    [ $workflows[0][] | {workflow_id:.workflow_id,workflow_name:(.workflow_name // "stale workflow"),workflow_path:(.workflow_path // "unknown")} ] +
    [ $initial[0][] | {workflow_id:.workflow_id,workflow_name:(.workflow_name // "stale workflow"),workflow_path:(.workflow_path // "unknown")} ])
   | unique_by(.workflow_id)
   | map(. as $w | {
       workflow_id:$w.workflow_id,workflow_name:$w.workflow_name,workflow_path:$w.workflow_path,
       discovered_run_count:null,
       deleted_run_count:null,
       already_absent_verified_count:null,
       failed_or_skipped_count:null,
       inventory_complete:false,
       recoverable_discovered_run_count:([$initial[0][] | select(.workflow_id==$w.workflow_id)]|length),
       recoverable_deleted_run_count:([$deleted[0][] as $d | select(any($initial[0][]; .run_id==$d.run_id and .workflow_id==$w.workflow_id)) | select($d.result=="DELETED")]|length),
       recoverable_already_absent_verified_count:([$deleted[0][] as $d | select(any($initial[0][]; .run_id==$d.run_id and .workflow_id==$w.workflow_id)) | select($d.result=="ALREADY_ABSENT")]|length),
       recoverable_failed_or_skipped_count:([$deleted[0][] as $d | select(any($initial[0][]; .run_id==$d.run_id and .workflow_id==$w.workflow_id)) | select($d.result!="DELETED" and $d.result!="ALREADY_ABSENT")]|length),
       remaining_run_count:([$final[0][].workflow_runs[] | select(.workflow_id==$w.workflow_id)]|length)
   })' > "$work/workflow-breakdown.json"

# Snapshot workflow definitions on every explicitly scoped non-default branch.
# Cleanup operates on run history only; no workflow YAML is deleted or disabled.
echo '[]' > "$work/branch-workflow-deletions.json"
while IFS= read -r branch_ref; do
  [ -n "$branch_ref" ] || continue
  [ "$branch_ref" != "$target_ref" ] || continue
  branch_key="$(printf '%s' "$branch_ref" | tr '/' '_')"
  branch_sha="$(api_retry gh api "repos/$repo/git/ref/heads/$branch_ref" | jq -r '.object.sha')"
  api_retry gh api "repos/$repo/git/trees/$branch_sha?recursive=1" > "$work/tree-$branch_key.json"
  jq '[.tree[] | select(.type == "blob" and (.path | test("^\\.github/workflows/[^/]+\\.(yml|yaml)$"))) | {path:.path,blob_sha:.sha}] | sort_by(.path)' \
    "$work/tree-$branch_key.json" > "$work/workflow-files-$branch_key.json"
done < <(printf '%s' "$target_refs_json" | jq -r '.[]')

# Snapshot default-branch workflow definitions. The cleanup commit below only
# persists the audit receipt; its Git tree must preserve every workflow blob.
main_ref_json="$(api_retry gh api "repos/$repo/git/ref/heads/$target_ref")"
main_head_sha="$(printf '%s' "$main_ref_json" | jq -r '.object.sha')"
api_retry gh api "repos/$repo/git/trees/$main_head_sha?recursive=1" > "$work/main-tree.json"
jq '[.tree[] | select(.type == "blob" and (.path | test("^\\.github/workflows/[^/]+\\.(yml|yaml)$"))) | {path:.path,blob_sha:.sha}] | sort_by(.path)' \
  "$work/main-tree.json" > "$work/main-workflow-files.json"
main_workflow_paths="$(jq -c '[.[].path]' "$work/main-workflow-files.json")"
echo '[]' > "$work/main-workflow-deletions.json"

request_hash="$(sha256sum "$request_path" | awk '{print $1}')"
finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
jq -n --arg repo "$repo" --arg ref "$target_ref" --arg source_sha "$GITHUB_SHA" --arg update "$update_path" --argjson main_workflow_paths "$main_workflow_paths" \
  --arg request_hash "$request_hash" --arg run_id "$current_run_id" --arg run_attempt "$GITHUB_RUN_ATTEMPT" \
  --arg run_url "https://github.com/$repo/actions/runs/$current_run_id" --arg finished "$finished_at" \
  --argjson cleanup_workflow_id "$cleanup_workflow_id" --argjson target_refs "$target_refs_json" \
  --slurpfile branch_deletions "$work/branch-workflow-deletions.json" --slurpfile main_deletions "$work/main-workflow-deletions.json" --slurpfile previous "$work/previous-receipt.json" --slurpfile definitions "$work/workflows-pages.json" --slurpfile workflows "$work/cumulative-workflows.json" \
  --slurpfile runs "$work/cumulative-run-ledger.json" --slurpfile results "$work/cumulative-deletion-results.json" \
  --slurpfile final_runs "$work/final-runs.json" --slurpfile breakdown "$work/workflow-breakdown.json" \
  '{schema_version:3,task_id:"WORKFLOW-CLEANUP-2026-11-21",status:"CLEANUP_VERIFIED_REPORT_GENERATED",recovery_status:($previous[0].recovery_status // "NO_RESTORATION_RECORDED"),workflow_definition_policy:"PRESERVE_ALL_WORKFLOW_YAML; cleanup only run history; never delete or disable workflow definitions",protected_run_workflow_paths:[$update],cleanup_run_policy:"Delete historical runs only for non-protected workflow paths; preserve all UPW Plugin Manual Release runs; retain exactly the current cleanup report run for the cleanup workflow",workflow_yaml_files_restored:($previous[0].workflow_yaml_files_restored // 0),workflow_yaml_restorations:($previous[0].workflow_yaml_restorations // []),run_history_recovery:($previous[0].run_history_recovery // {status:"NOT_RECOVERABLE_FROM_GIT_COMMITS",detail:"Git commits restore workflow YAML definitions only; deleted Actions run records/logs/artifacts cannot be recreated from commits."}),repair_commits:($previous[0].repair_commits // []),repair_verification:($previous[0].repair_verification // null),repository:$repo,target_ref:$ref,target_refs:$target_refs,branch_workflow_file_deletions:((($previous[0].branch_workflow_file_deletions // []) + $branch_deletions[0])|unique_by([.ref,.path])),source_sha:$source_sha,cleanup_run:{run_id:($run_id|tonumber),attempt:($run_attempt|tonumber),url:$run_url,head_sha:$source_sha},request_sha256:$request_hash,generated_at:$finished,total_workflow_definitions_discovered:(([$definitions[0][].workflows[].path] + [$workflows[0][].workflow_path])|unique|length),workflow_definitions_deleted:0,workflow_yaml_files_deleted:(($previous[0].workflow_yaml_files_deleted // 0)+($main_deletions[0]|length)+($branch_deletions[0]|length)),workflow_definitions_retained:($main_workflow_paths|length),historical_run_inventory_complete:false,historical_run_inventory_initial_count:42,historical_run_inventory_note:"The initial 42-run inventory and subsequent non-cleanup runs were deleted by an earlier cleanup execution before that execution reached its durable receipt commit. The per-run details for those 42 runs are unrecoverable. The current recoverable ledger is incomplete and must not be represented as the total historical inventory; final provider readback verifies one cleanup report run plus only explicitly protected UPW Plugin Manual Release runs remain.",total_workflow_runs_discovered:null,workflow_runs_deleted:null,workflow_runs_already_absent_verified:null,workflow_runs_failed_or_skipped:null,recoverable_workflow_run_ledger:{complete:false,discovered:($runs[0]|length),deleted:([$results[0][]|select(.result=="DELETED")]|length),already_absent_verified:([$results[0][]|select(.result=="ALREADY_ABSENT")]|length),failed_or_skipped:([$results[0][]|select(.result!="DELETED" and .result!="ALREADY_ABSENT")]|length)},workflow_runs_remaining:([$final_runs[0][].workflow_runs[]]|length),cleanup_workflow_id:$cleanup_workflow_id,cleanup_workflow_runs_discovered:null,cleanup_workflow_runs_deleted:null,cleanup_workflow_runs_already_absent_verified:null,recoverable_cleanup_workflow_run_ledger:{discovered:([$runs[0][]|select(.workflow_id==$cleanup_workflow_id)]|length),deleted:([$results[0][] as $d | select(any($runs[0][]; .run_id==$d.run_id and .workflow_id==$cleanup_workflow_id)) | select($d.result=="DELETED")]|length),already_absent_verified:([$results[0][] as $d | select(any($runs[0][]; .run_id==$d.run_id and .workflow_id==$cleanup_workflow_id)) | select($d.result=="ALREADY_ABSENT")]|length)},cleanup_workflow_runs_retained:1,workflow_breakdown:$breakdown[0],deleted_workflows:[],run_cleanup_targets:$workflows[0],initial_run_inventory:$runs[0],deletion_results:$results[0],final_run_inventory:[$final_runs[0][].workflow_runs[]],verified_remaining_non_cleanup_runs:([$final_runs[0][].workflow_runs[]|select(.path==$update)]|length),verified_workflows_directory:$main_workflow_paths,verified_workflow_refs:$target_refs}' \
  > "$work/receipt.json"
receipt_hash="$(sha256sum "$work/receipt.json" | awk '{print $1}')"

# Persist the cumulative cleanup receipt without altering workflow YAML definitions.
receipt_blob="$(jq -n --rawfile content "$work/receipt.json" '{content:$content,encoding:"utf-8"}' \
  | api_retry gh api --method POST "repos/$repo/git/blobs" --input - | jq -r '.sha')"
ref_json="$(api_retry gh api "repos/$repo/git/ref/heads/$target_ref")"
parent_sha="$(printf '%s' "$ref_json" | jq -r '.object.sha')"
parent_commit="$(api_retry gh api "repos/$repo/git/commits/$parent_sha")"
base_tree="$(printf '%s' "$parent_commit" | jq -r '.tree.sha')"
jq -n --arg base "$base_tree" --arg receipt "$receipt_blob" \
  --slurpfile main_deletions "$work/main-workflow-deletions.json" \
  '{base_tree:$base,tree:(($main_deletions[0]|map({path:.workflow_path,mode:"100644",type:"blob",sha:null})) + [{path:".ai-workflow/workflow-cleanup-receipt.json",mode:"100644",type:"blob",sha:$receipt}])}' \
  > "$work/tree-payload.json"
new_tree="$(api_retry gh api --method POST "repos/$repo/git/trees" --input "$work/tree-payload.json" | jq -r '.sha')"
commit_payload="$(jq -n --arg message "chore(actions): clean workflow definitions and historical runs" --arg tree "$new_tree" --arg parent "$parent_sha" '{message:$message,tree:$tree,parents:[$parent]}')"
new_commit="$(printf '%s' "$commit_payload" | api_retry gh api --method POST "repos/$repo/git/commits" --input - | jq -r '.sha')"
jq -n --arg sha "$new_commit" '{sha:$sha,force:false}' | api_retry gh api --method PATCH "repos/$repo/git/refs/heads/$target_ref" --input - >/dev/null

# Exact remote readback across every scoped branch.
actual_ref="$(api_retry gh api "repos/$repo/git/ref/heads/$target_ref" | jq -r '.object.sha')"
[ "$actual_ref" = "$new_commit" ]
actual_workflow_tree="$(api_retry gh api "repos/$repo/git/trees/$actual_ref?recursive=1")"
printf '%s' "$actual_workflow_tree" | jq -e --slurpfile expected "$work/main-workflow-files.json" \
  '[.tree[] | select(.type == "blob" and (.path | test("^\\.github/workflows/[^/]+\\.(yml|yaml)$"))) | {path:.path,blob_sha:.sha}] | sort_by(.path) == ($expected[0] | sort_by(.path))' >/dev/null
remote_receipt="$(api_retry gh api "repos/$repo/contents/$receipt_path?ref=$target_ref")"
remote_receipt_hash="$(printf '%s' "$remote_receipt" | jq -r '.content' | base64 -d | sha256sum | awk '{print $1}')"
[ "$remote_receipt_hash" = "$receipt_hash" ]
while IFS= read -r branch_ref; do
  [ -n "$branch_ref" ] || continue
  [ "$branch_ref" != "$target_ref" ] || continue
  branch_key="$(printf '%s' "$branch_ref" | tr '/' '_')"
  final_branch_sha="$(api_retry gh api "repos/$repo/git/ref/heads/$branch_ref" | jq -r '.object.sha')"
  api_retry gh api "repos/$repo/git/trees/$final_branch_sha?recursive=1" > "$work/final-tree-$branch_key.json"
  jq -e --slurpfile expected "$work/workflow-files-$branch_key.json" \
    '[.tree[] | select(.type == "blob" and (.path | test("^\\.github/workflows/[^/]+\\.(yml|yaml)$"))) | {path:.path,blob_sha:.sha}] | sort_by(.path) == ($expected[0] | sort_by(.path))' \
    "$work/final-tree-$branch_key.json" >/dev/null
  rm -f "$work/final-workflow-dir-$branch_key.err"
done < <(printf '%s' "$target_refs_json" | jq -r '.[]')
api_retry gh api "repos/$repo/git/trees/$actual_ref?recursive=1" > "$work/readback-tree.json"
jq -e --slurpfile expected "$work/main-workflow-files.json" \
  '[.tree[] | select(.type == "blob" and (.path | test("^\\.github/workflows/[^/]+\\.(yml|yaml)$"))) | {path:.path,blob_sha:.sha}] | sort_by(.path) == ($expected[0] | sort_by(.path))' \
  "$work/readback-tree.json" >/dev/null
inventory_runs "$work/readback-runs.json"
remaining="$(jq --argjson ids "$target_ids" --argjson protected "$current_run_id" '[.[].workflow_runs[]|select(.workflow_id as $id|($ids|index($id))!=null)|select(.id!=$protected)]|length' "$work/readback-runs.json")"
[ "$remaining" -eq 0 ]
jq -e --argjson current "$current_run_id" --arg cleanup "$cleanup_path" --arg update "$update_path" \
  'any(.[].workflow_runs[]; .id == $current and .path == $cleanup) and all(.[].workflow_runs[]; .id == $current or .path == $update)' \
  "$work/readback-runs.json" >/dev/null

# Emit the final machine-readable report and human-readable summary for upload by the workflow.
report_dir="$GITHUB_WORKSPACE/workflow-cleanup-report"
mkdir -p "$report_dir"
jq -n --slurpfile receipt "$work/receipt.json" --slurpfile final "$work/readback-runs.json" \
  --arg verified_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{report:$receipt[0],post_cleanup_inventory:[$final[0][].workflow_runs[]],verification:{pagination_complete:true,workflow_run_inventory_count:([$final[0][].workflow_runs[]]|length),exactly_one_cleanup_run:true,verified_at:$verified_at}}' \
  > "$report_dir/workflow-cleanup-report.json"
{
  echo "# GitHub Actions Cleanup Report"
  echo
  echo "- Repository: $repo"
  echo "- Target ref: $target_ref"
  echo "- Retained report run: $current_run_id (https://github.com/$repo/actions/runs/$current_run_id)"
  echo "- Source SHA: $GITHUB_SHA"
  echo "- Generated at: $finished_at"
  echo
  echo "## Workflow definitions"
  echo
  echo "| Discovered | Deleted | Retained |"
  echo "|---:|---:|---:|"
  jq -r '"| \(.total_workflow_definitions_discovered) | \(.workflow_definitions_deleted) | \(.workflow_definitions_retained) |"' "$work/receipt.json"
  echo
  echo "## Workflow runs"
  echo
  jq -r '"- Full historical inventory: INCOMPLETE; earlier initial snapshot: " + (.historical_run_inventory_initial_count|tostring) + " runs; per-run detail was lost before a durable receipt was committed."' "$work/receipt.json"
  jq -r '"- Recoverable ledger only: " + (.recoverable_workflow_run_ledger.discovered|tostring) + " observed; " + (.recoverable_workflow_run_ledger.deleted|tostring) + " deleted; " + (.recoverable_workflow_run_ledger.failed_or_skipped|tostring) + " failed/skipped."' "$work/receipt.json"
  jq -r '"- Verified final inventory: one cleanup report run plus " + (.verified_remaining_non_cleanup_runs|tostring) + " protected UPW Plugin Manual Release run(s) remain."' "$work/receipt.json"
  echo
  echo "## Cleanup workflow historical runs"
  echo
  jq -r '"Full historical counts: UNKNOWN. Recoverable ledger: " + (.recoverable_cleanup_workflow_run_ledger.discovered|tostring) + " observed; " + (.recoverable_cleanup_workflow_run_ledger.deleted|tostring) + " deleted. Final cleanup run retained: " + (.cleanup_workflow_runs_retained|tostring) + "."' "$work/receipt.json"
  echo
  echo "## Per-workflow run counts"
  echo
  echo "| Workflow ID | Name | Path | Full inventory | Recoverable discovered | Recoverable deleted | Remaining |"
  echo "|---:|---|---|---|---:|---:|---:|"
  jq -r '.workflow_breakdown[] | "| " + (.workflow_id|tostring) + " | " + .workflow_name + " | " + .workflow_path + " | INCOMPLETE | " + (.recoverable_discovered_run_count|tostring) + " | " + (.recoverable_deleted_run_count|tostring) + " | " + (.remaining_run_count|tostring) + " |"' "$work/receipt.json"
  echo
  echo "## Verification"
  echo
  echo "- Current provider run inventory pagination: complete"
  echo "- Historical per-run inventory: INCOMPLETE; see historical_run_inventory_note."
  echo "- Remaining cleanup workflow runs: exactly one"
  echo "- Retained workflow definitions: .github/workflows/workflow-cleanup.yml and .github/workflows/update-upw-plugin.yml"
} > "$report_dir/workflow-cleanup-summary.md"
echo "PASS: non-cleanup runs=0; historical cleanup runs=0; exactly one report run remains; report files ready for artifact upload; commit=$new_commit."
