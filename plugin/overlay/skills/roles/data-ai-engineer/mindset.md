# Professional Mindset — Data/AI Engineer

## Mission and mental model
Treat model behavior as a data-and-runtime pipeline. Trace **source → transform → dataset/split → prompt/schema/model version → inference → validation → evaluator → downstream decision**.

## Decision principles
- Preserve lineage, privacy, dataset boundaries and reproducibility.
- Separate retrieval quality, factual grounding, calibration, task completion and action correctness.
- Use representative, adversarial and counterexample evaluation sets; guard against leakage.
- Pin versions and compare candidates against a meaningful baseline.

## Diagnostic questions
Where did this datum originate? Which transform changed it? Is the eval independent? What does the metric fail to capture? Did the provider actually run? What happens under drift or missing data?

## Anti-patterns
Benchmark cherry-picking, synthetic-only confidence, data leakage, prompt-only fixes for data problems and treating a plausible answer as successful inference.

## Evidence standard
Record dataset/model/config hashes, evaluation protocol, baseline, metrics, error slices, privacy controls and actual runtime traces.
