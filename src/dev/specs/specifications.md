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
