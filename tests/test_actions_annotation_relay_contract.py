import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class ActionsAnnotationRelayContractTests(unittest.TestCase):
    def test_no_runner_and_empty_steps_trigger_notion_relay(self):
        paths = [
            "docs/GITHUB-ACTIONS-RUN-LIFECYCLE.md",
            "plugin/overlay/skills/github-actions-run-lifecycle/SKILL.md",
            "plugin/overlay/skills/github-actions-tree-fallback/SKILL.md",
            "plugin/overlay/references/github-actions-run-lifecycle.md",
        ]
        for rel in paths:
            content = (ROOT / rel).read_text(encoding="utf-8").lower()
            self.assertIn("runner_id: 0", content, rel)
            self.assertIn("steps: []", content, rel)
            self.assertIn("trigger", content, rel)
            self.assertIn("notion relay", content, rel)
            self.assertIn("annotations_count > 0", content, rel)
            self.assertIn("notion_relay_receipt_not_found_for_exact_run", content, rel)
            self.assertIn("run_attempt", content, rel)
            self.assertIn("check_run_id", content, rel)

    def test_api_method_blocked_is_not_terminal_before_relay(self):
        for rel in ["docs/GITHUB-ACTIONS-RUN-LIFECYCLE.md", "plugin/overlay/skills/github-actions-run-lifecycle/SKILL.md"]:
            content = (ROOT / rel).read_text(encoding="utf-8").lower()
            section = content.split("2026-11-24 correction — no-runner state triggers notion annotation recovery", 1)[1]
            self.assertLess(section.index("notion relay"), section.index("api_method_blocked"), rel)
            self.assertIn("does not close the diagnostic branch", section, rel)

    def test_owner_silence_gate_is_explicit_in_core_skills_and_prompt(self):
        for rel in ["plugin/overlay/skills/always-on-guard/SKILL.md", "plugin/overlay/skills/chat-mode-closed-loop/SKILL.md"]:
            content = (ROOT / rel).read_text(encoding="utf-8")
            self.assertIn("NO_FINAL_OUTPUT", content)
            self.assertIn("NO_USER_HANDOFF", content)
        manifest = __import__("json").loads((ROOT / "plugin/overlay/plugin.json").read_text(encoding="utf-8"))
        prompt = manifest["extensions"]["com.openai"]["interface"]["defaultPrompt"]
        self.assertEqual(len(prompt), 48)
        actions = next(item for item in prompt if item.startswith("ACTIONS EVIDENCE:"))
        self.assertIn("runner_id=0", actions)
        self.assertIn("steps=[]", actions)
        self.assertIn("Notion annotation relay", actions)
        self.assertIn("NOTION_RELAY_RECEIPT_NOT_FOUND_FOR_EXACT_RUN", actions)
        self.assertIn("API_METHOD_BLOCKED is transport-only", actions)
        reporting = next(item for item in prompt if item.startswith("OWNER-FACING REPORTING:"))
        self.assertIn("Do not send progress narration", reporting)
        self.assertIn("while any authorized AI-owned requirement remains runnable", reporting)
        communication = next(item for item in prompt if item.startswith("COMMUNICATION MODES:"))
        self.assertIn("DEEP_WORK = continuous full requirements execution", communication)

if __name__ == "__main__":
    unittest.main()
