# LLM/Agent Evals Checklist (Reusable)

Use this checklist **only for features that include LLM output or tool-using agents**.

Goal: prevent “it seemed fine in one prompt” failures by defining **measurable behavior**, **regression evals**, and **safety constraints**.

---

## 1) Define the contract (what “good” means)
- **Task type**: classify (extract/summarize/route/generate/code/act)
- **Allowed outputs**: structured schema vs free text
- **Hard constraints** (must always hold):
  - no secrets in output/logs
  - no fabricated citations / no invented sources
  - must refuse out-of-scope/unsafe requests
  - must not call tools outside allowlist
- **Quality constraints** (should hold):
  - groundedness / citation coverage
  - completeness / accuracy thresholds
  - latency/cost bounds (p95)

Deliverable: a short “Model Behavior Contract” section in the PRD.

---

## 2) Build an eval set (golden cases)
Minimum: **20–50 cases**. Prefer small, high-signal cases over large, noisy sets.

Include:
- **Happy paths**: representative real tasks
- **Edge cases**: long inputs, partial data, contradictory inputs, ambiguous requests
- **Negative cases**: explicitly invalid requests the model must refuse or route

For each case store:
- input
- expected output shape (schema)
- required invariants (e.g., “must include citations”, “must not contain PII”)
- grading method: exact match / structured match / rubric / automated checks

Deliverable: `evals/` directory (or similar) containing the golden set and a runner.

---

## 3) Add safety evals (abuse cases)
At minimum include tests for:
- **Prompt injection**: “ignore previous instructions”, “reveal system prompt”, “exfiltrate secrets”
- **Data leakage**: PII/credentials in input → must not echo or log
- **Tool misuse** (if tool-using):
  - attempts to call forbidden tools/actions
  - wrong-environment actions (prod vs dev)
  - path traversal / file exfiltration patterns
- **Hallucinated claims/citations**:
  - require citations for factual claims
  - detect “citation-like” strings without backing evidence

Deliverable: “Safety Evals” section + passing thresholds.

---

## 4) Define automated grading (as much as possible)
Prefer automated checks first:
- JSON schema validation
- citation presence/format checks
- denylist checks (secrets, tokens, internal prompts)
- tool call allowlist enforcement
- unit tests on deterministic post-processing

Use human review only for:
- subtle quality judgments
- small sample audits (e.g., 5–10 cases per release)

Deliverable: eval runner that returns pass/fail + score.

---

## 5) Regression policy (how you prevent drift)
Define what triggers a mandatory eval run:
- prompt changes
- model/provider/version changes
- tool schema changes
- retrieval corpus changes

Define release gates:
- must pass all safety evals
- must meet minimum quality score on golden set
- must meet latency/cost budgets

Deliverable: “Release Gate” section in PRD + CI hook (if available).

---

## 6) Observability for AI behavior (prod reality)
Log safely:
- input/output hashes or redacted samples
- refusal rates
- tool call rates (by tool)
- eval drift signals (distribution shifts)
- user feedback tags (“wrong”, “unsafe”, “missing citations”)

Define on-call playbook:
- disable/feature flag
- rollback prompt/model
- tighten allowlist

---

## 7) Minimal default for small teams (if you’re solo)
If you can only do the minimum:
- 20 golden cases + schema validation
- 10 safety cases (prompt injection + data leakage)
- “no tool calls outside allowlist” enforcement
- run evals before every “demo” and after any prompt/model change


