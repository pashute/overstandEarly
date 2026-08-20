# Filename: specifications.md
# Version: 0.1

# overstand — specifications

Four-stage React web program. Goal: build human-verifiable knowledge
constructs from source text, edit them visually, and answer queries
through them **without** AI at runtime. AI agents only assist in
building and repairing the constructs.

## Stage 1 — Gather
- Input: Wikipedia URLs (opened/fetched in browser) or built-in test text.
- Output: `overstandDocs`, entries filed as `{ field :: topic }`.

## Stage 2 — Construct (AI-agent assisted)
From the gathered text, build:
1. **Word model** — statistical word-usage model giving possible
   continuations (GPT-like emulation). No numbered tokens: each unit is
   identified by *name + context* (e.g. `ball@after:red`).
2. **Logical constructs** — each piece of information summarized as a
   formal, human-verifiable statement (e.g. `color(ball, red)`,
   `neighbor(john, dick)`). Not natural language, but readable.
3. **Result types** — three response modes: *scenario* (generated
   continuation), *deep question* (multi-hop over constructs), *quick*
   (single lookup). Constraints supported, especially **negative**
   ones (forbidden words / facts).
4. **Test & fix** — run known Q/A pairs against the constructs;
   failures trigger repair (training).
5. **Learning on the fly** — new facts can be added at query time;
   every change produces a new construct **version** (v1, v2, …).

## Stage 3 — Edit
Present chosen constructs as a graph the user can manipulate:
edit nodes and connections, move in/out, closer/further, zoom in/out,
delete, add, cut and paste.

## Stage 4 — Query
- Plain-English queries run through the constructs **without AI** and
  return results.
- Bad results go to an AI assistant that suggests construct changes so
  results work; accepted suggestions create a new version (feeds back
  into Stage 2.5).

## Testing
Child's story: Jane, Spot, Dick and John (the neighbor). Neighbor
connections, objects, colors, feelings, actions across simple scenes.
Simple plain-English questions with expected answers.

## Implementation notes
- React + Vite, single-page, tab per stage. No backend; state in memory.
- Word model: trigram counts, keys are words themselves.

---

# Brain Module Architecture

The Brain Module is the **offline organizer and maintenance engine** for the knowledge base. It powers the deep reasoning during the Construct and Query stages, managing long-term memory, iterative thought processes, and knowledge consolidation.

> Telegraphic breakdown. Each section = one implementation phase. Build iteratively; each phase is independently testable.

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

## 2. Storage Layer — Aspect Files

- **Aspect file**: cross-entity pointer / connector
- Points to: specific entity terms + named sub-regions ("neighborhoods")
- Creates new **associations** not present in any single entity file
- Assembles topic lexicons and field lexicons
- Properties: `{ id, label, pointers: [{entityFile, termId, neighborhood}], connections: [{from, to, relType}] }`
- Lexicons are **small + modular** — load only what is relevant to the current context
- Hot-load: on topic shift, swap relevant aspect files; unload irrelevant ones

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

# Thought Process & Response Architecture

The brain executes a dual-path reasoning model to generate answers: immediate statistical responses paired with deep iterative reasoning.

## 4. Response Layer — Fast Path (Statistical)

- On incoming query: immediately return statistically close guess
- Source: existing word model (bigram/trigram continuations — already in `buildWordModel`)
- Extend: weight by loaded lexicon context
- Output: fast draft answer + confidence score
- Feed fast answer → Deep Path (below) asynchronously

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

## 6. Parallel Reasoning — Competing Thought Threads

- Multiple hypothesis branches run concurrently (async workers / promises)
- Each thread: isolated copy of working facts + current lexicon
- Thread lifecycle: spawn → reason → score → report
- Arbiter: selects winner by confidence; discards losers
- Implementation: `Promise.all` / worker threads / lightweight coroutines
- Threads are cheap: each works on a small loaded lexicon, not the full brain

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
