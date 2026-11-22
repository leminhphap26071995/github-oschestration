from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
DOC = (ROOT / 'docs/GOAL-CONVERGENT-MIN-CONTEXT-LOOP.md').read_text(encoding='utf-8').lower()


class TestGoalConvergentMinimalContextLoop(unittest.TestCase):
    def test_concept_card_precedes_technical_planning(self):
        self.assertLess(DOC.index('## concept first'), DOC.index('## minimal-context routing'))
        for phrase in ('core concept', 'domain model', 'invariants', 'success oracle', 'each must'):
            self.assertIn(phrase, DOC)

    def test_route_is_compact_and_git_tree_first(self):
        for phrase in ('compact route card', 'latest progress comments', 'first unmet criterion', 'git tree at the selected ref/sha', 'only relevant source/test blobs'):
            self.assertIn(phrase, DOC)

    def test_every_iteration_compares_plan_actual_and_goal(self):
        for phrase in ('planned change vs actual source/state', 'expected behavior vs observed result', 'every affected must', 'without weakening acceptance'):
            self.assertIn(phrase, DOC)

    def test_parallelism_uses_real_executors_and_disjoint_write_sets(self):
        self.assertIn('non-overlapping write sets', DOC)
        self.assertIn('real authorized executors available', DOC)
        self.assertIn('git tree analysis identifies work boundaries; it does not create workers', DOC)

    def test_progress_comments_and_three_line_output(self):
        self.assertIn('notion comments are the primary append-only progress history', DOC)
        self.assertIn('exactly three short sentences', DOC)
        self.assertIn('fewer than 10 words', DOC)
        self.assertIn('not a guarantee against physical host timeout', DOC)


if __name__ == '__main__':
    unittest.main()