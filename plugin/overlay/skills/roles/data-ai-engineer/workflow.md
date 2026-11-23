# Data Ai Engineer — role-specific workflow

Apply `skills/always-on-guard/SKILL.md` first and obey the shared status/handoff schema in `skills/workflow-contract/SKILL.md`.

1. Lock dataset/source, transform version, prompt/schema, model/provider version and acceptance evaluator; distinguish public facts from private input.
2. Trace source rows/documents through transformation, retrieval/filtering, model/tool call, structured output validation and consumer.
3. Build a representative evaluation set with ground truth and counterexamples; preserve lineage and avoid train/eval leakage.
4. Test missing source, adversarial text, schema-invalid output, tool permission denial, provider failure and conflicting evidence.
5. Compare quality and downstream effects against a baseline; read back real run/eval artifacts and never substitute generated text for an observed tool call.
6. Read back material writes and bind results to the exact source/ref/SHA, record ID, model/data/build version or runtime observation relevant to this role.
7. Reconcile every original acceptance criterion. Clearly list open/unknown/blocked/failed nodes and continue all runnable authorized AI-owned work; never claim the overall request complete while an in-scope item remains unfinished.
