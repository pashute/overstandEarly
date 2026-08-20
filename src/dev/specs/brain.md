# Filename: brain.md
# Version: 0.1

# overstandEarly — Brain Module Specs

> Telegraphic breakdown. Each section = one implementation phase. Build iteratively; each phase is independently testable.

---

## 1. Storage Layer — Entity Files

- **Entity file**: vocabulary unit for a knowledge domain / topic / scenario
- Each file holds **term definitions** (not prose — word-networks)
  - Relations: `is-a`, `has-a`, `part-of`, `causes`, `enables`, `precedes`, `opposes`
  - Each term node: `{ id, relations: [{type, target}] }`
- Files are **overlapping** — same term can appear in multiple entity files
- Scope types: field (biology, law…), topic (cooking, travel…), scenario (emergency, greeting…), scene
  - Scene: ordered **snapshots** → each snapshot has spatial descriptors + optional graphic sections (text → image reconstruction)
- Format: JSON or YAML; plain files on disk; git-tracked
- Indexable by id, scope, term, relation type

---

## 2. Storage Layer — Aspect Files

- **Aspect file**: cross-entity pointer / connector
- Points to: specific entity terms + named sub-regions ("neighborhoods")
- Creates new **associations** not present in any single entity file
- Assembles topic lexicons and field lexicons
- Properties: `{ id, label, pointers: [{entityFile, termId, neighborhood}], connections: [{from, to, relType}] }`
- Lexicons are **small + modular** — load only what is relevant to the current context
- Hot-load: on topic shift, swap relevant aspect files; unload irrelevant ones

---

## 3. Brain Module — Long-Term Memory

- Persists entity files + aspect files as hidden long-term storage
- **Cleanup / consolidation ("dreaming")**: scheduled night-time pass
  - Merge duplicates; prune low-confidence edges; strengthen reinforced paths
- **Learning**: new experience → new or updated entity/aspect files
- Brain module API:
  - `brain.load(contextHint)` → returns relevant lexicon
  - `brain.store(newFacts, source)` → writes to entity/aspect files
  - `brain.dream()` → consolidation pass

---

## 4. Response Layer — Fast Path (Statistical)

- On incoming query: immediately return statistically close guess
- Source: existing word model (bigram/trigram continuations — already in `buildWordModel`)
- Extend: weight by loaded lexicon context
- Output: fast draft answer + confidence score
- Feed fast answer → Deep Path (below) asynchronously

---

## 5. Response Layer — Deep Path (Iterative Pondering)

- Receives fast-path draft; reasons over loaded facts + entity graph
- **Iteration loop**:
  1. Generate candidate conclusion
  2. Score confidence + consistency with known facts
  3. If low confidence → spawn competing hypothesis
  4. Evaluate competing hypotheses in parallel or sequence
  5. Select winner → promote as current best answer
  6. Feed winner back as new context → repeat
- **Rollback**: if new evidence contradicts, revert to prior branch
- Concludes when: confidence threshold met OR max iterations reached
- Outputs: `{ answer, confidence, iterations, alternatives }`

---

## 6. Parallel Reasoning — Competing Thought Threads

- Multiple hypothesis branches run concurrently (async workers / promises)
- Each thread: isolated copy of working facts + current lexicon
- Thread lifecycle: spawn → reason → score → report
- Arbiter: selects winner by confidence; discards losers
- Implementation: `Promise.all` / worker threads / lightweight coroutines
- Threads are cheap: each works on a small loaded lexicon, not the full brain

---

## 7. Human Control Interface

- **Interruption**: user can inject signal mid-pondering
  - Clarify: add fact to active context
  - Prune: mark a direction forbidden (adds to constraints)
  - Branch: force a competing thread to be tried
  - Commit: accept current best answer; stop pondering
- **Dynamic breakpoints**: pause at specified iteration count or confidence level
- **Instruction sequences**: scripted reasoning steps with breakpoints
  - `[{step, action, breakpointCondition}]`
- Control signals are lightweight messages passed into the pondering loop

---

## 8. LLM Bridge (Optional / Bounded)

- Brain calls LLM only when local knowledge is insufficient
- Query type: targeted, small-scope question → expects small structured response
- Response is parsed into new entity/aspect file entries (not stored as raw text)
- Rate-limited; cached; never used for final answer — only for knowledge expansion
- Keeps system free/open: LLM is a plug-in, not a dependency

---

## 9. Open Source & Architecture Constraints

- Language: JavaScript / Node.js (consistent with existing codebase)
- All storage: plain JSON/YAML files; no proprietary DB required
- LLM access: optional; any OpenAI-compatible API or local model (Ollama)
- License: MIT
- No required cloud dependency; runs fully offline

---

## 10. Build Order (Proposed Steps)

| Step | Deliverable |
|------|-------------|
| 1 | Entity file schema + reader/writer |
| 2 | Aspect file schema + lexicon loader |
| 3 | Brain module: `load` / `store` API |
| 4 | Fast-path integration with existing word model |
| 5 | Deep-path single-thread iterative reasoner |
| 6 | Competing threads (parallel hypothesis arbiter) |
| 7 | Rollback + feedback loop |
| 8 | Human control interface (interrupt / prune / branch) |
| 9 | Dream/consolidation pass |
| 10 | LLM bridge (bounded, optional) |

---

## Open Questions (to resolve per step)

- Entity file: JSON vs YAML vs custom DSL?
- Neighborhood granularity: how many terms per neighborhood?
- Pondering loop: sync iteration vs true async threads in the browser?
- Dream scheduling: timer-based vs explicit API call?
- LLM bridge: which local models are acceptable? Ollama? Transformers.js?
