import json
import unittest
from unittest.mock import Mock
from scripts.collect_github_annotations import GitHubAnnotationsCollector, GitHubAPIError

class FakeResponse:
    def __init__(self, payload, headers=None):
        self.payload = json.dumps(payload).encode()
        self.headers = headers or {}
    def __enter__(self): return self
    def __exit__(self, *_args): return False
    def read(self): return self.payload

def run_data(repo="owner/repo", run_id=1234, attempt=2):
    return {"id":run_id,"run_attempt":attempt,"name":"CI","path":".github/workflows/ci.yml",
            "head_sha":"a"*40,"status":"completed","conclusion":"failure",
            "repository":{"full_name":repo}}

def jobs_data(repo="owner/repo", run_id=1234):
    return {"total_count":2,"jobs":[
        {"id":501,"run_id":run_id,"name":"lint","status":"completed","conclusion":"success",
         "check_run_url":f"https://api.github.com/repos/{repo}/check-runs/501"},
        {"id":502,"run_id":run_id,"name":"tests","status":"completed","conclusion":"failure",
         "check_run_url":f"https://api.github.com/repos/{repo}/check-runs/502"}]}

class CollectorTests(unittest.TestCase):
    def make(self, payloads):
        opener=Mock(side_effect=[FakeResponse(p) for p in payloads])
        return GitHubAnnotationsCollector("token", opener=opener), opener

    def test_resolves_exact_repository_run_attempt_and_check_runs(self):
        collector, opener=self.make([run_data(),jobs_data(),[],
            [{"path":"src/test.py","message":"assertion failed","annotation_level":"failure"}]])
        result=collector.collect("owner/repo",1234)
        self.assertEqual((result["repository"],result["run_id"],result["run_attempt"]),("owner/repo",1234,2))
        self.assertEqual([j["check_run_id"] for j in result["jobs"]],[501,502])
        self.assertEqual(result["annotation_count"],1)
        self.assertEqual(result["annotations"][0]["check_run_id"],502)
        urls=[c.args[0].full_url for c in opener.call_args_list]
        self.assertTrue(any("/actions/runs/1234/attempts/2/jobs" in u for u in urls))
        self.assertTrue(any("/check-runs/502/annotations" in u for u in urls))

    def test_optional_check_run_id_filters_to_one_check(self):
        collector, opener=self.make([run_data(),jobs_data(),
            [{"path":"src/test.py","message":"selected","annotation_level":"warning"}]])
        result=collector.collect("owner/repo",1234,check_run_id=502)
        self.assertEqual([j["check_run_id"] for j in result["jobs"]],[502])
        urls=[c.args[0].full_url for c in opener.call_args_list]
        self.assertFalse(any("/check-runs/501/annotations" in u for u in urls))
        self.assertTrue(any("/check-runs/502/annotations" in u for u in urls))

    def test_rejects_check_run_outside_requested_run(self):
        collector, opener=self.make([run_data(),jobs_data()])
        with self.assertRaisesRegex(GitHubAPIError,"does not belong"):
            collector.collect("owner/repo",1234,check_run_id=999)
        self.assertEqual(opener.call_count,2)

    def test_rejects_repository_identity_mismatch(self):
        collector, opener=self.make([run_data(repo="other/repo")])
        with self.assertRaisesRegex(GitHubAPIError,"identity mismatch"):
            collector.collect("owner/repo",1234)
        self.assertEqual(opener.call_count,1)

    def test_rejects_job_from_another_run(self):
        collector, _=self.make([run_data(),jobs_data(run_id=9999)])
        with self.assertRaisesRegex(GitHubAPIError,"belongs to run 9999"):
            collector.collect("owner/repo",1234)

if __name__=="__main__":
    unittest.main()
