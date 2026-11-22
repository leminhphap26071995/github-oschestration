# Real workflow syntax failure — no-runner annotation recovery

- Repository: leminhphap26071995/github-oschestration
- Defect source SHA: 2059d7d6560b8a9527bab2ff4a0e8e56b7868dfc
- Defective file: .github/workflows/zz-synthetic-invalid-workflow.yml
- GitHub source run: https://github.com/leminhphap26071995/github-oschestration/actions/runs/45006895699 (run_id=45006895699, attempt=1)
- Source run conclusion: failure
- Exact-attempt jobs: 0
- runner_id: NOT PRESENT — GitHub returned zero job records, so no runner_id field exists
- steps: NOT PRESENT — there is no job object whose steps array can be read
- Source run log retrieval: UNAVAILABLE (GitHub returned an error for a run with no jobs)
- Independent diagnostic observer: https://github.com/leminhphap26071995/github-oschestration/actions/runs/45006896823 (run_id=45006896823)

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
