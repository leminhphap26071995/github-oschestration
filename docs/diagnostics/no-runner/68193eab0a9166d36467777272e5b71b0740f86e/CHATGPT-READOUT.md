# Real workflow syntax failure — no-runner annotation recovery

- Repository: leminhphap26071995/github-oschestration
- Defect source SHA: 68193eab0a9166d36467777272e5b71b0740f86e
- Defective file: .github/workflows/zz-synthetic-invalid-workflow.yml
- GitHub source run: https://github.com/leminhphap26071995/github-oschestration/actions/runs/45008406999 (run_id=45008406999, attempt=1)
- Source run conclusion: failure
- Exact-attempt jobs: 0
- runner_id: NOT PRESENT — GitHub returned zero job records, so no runner_id field exists
- steps: NOT PRESENT — there is no job object whose steps array can be read
- Source run log retrieval: UNAVAILABLE (GitHub returned an error for a run with no jobs)
- Independent diagnostic observer: https://github.com/leminhphap26071995/github-oschestration/actions/runs/45008407977 (run_id=45008407977)

## Diagnostic produced from the actual malformed YAML

~~~text
.github/workflows/zz-synthetic-invalid-workflow.yml:3:0: could not parse as YAML: yaml: line 3: did not find expected ',' or ']' [syntax-check]
~~~

## Annotation retrieval contract

- actionlint read the committed invalid workflow file and generated the diagnostic; no error message was pre-written in the fixture.
- The registered GitHub Actions problem matcher converts the diagnostic into a Check Run annotation on the observer job.
- ChatGPT must retrieve the observer job's Check Run annotations by its exact check_run_id after the observer run completes. The source run itself has no job/check-run annotation record.
- Quota classification: UNKNOWN / NOT INDICATED. Zero source jobs and unavailable logs are not quota evidence.

## Raw source evidence

- 
- 
- 
