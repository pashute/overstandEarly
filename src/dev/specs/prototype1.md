# Filename: prototype1.md
# Version: 0.1

# Prototype 1 — Specification

## Goal

Single-page React app that runs all four stages of the overstand pipeline
against the built-in child story, with a serverless query API and an
end-to-end test that exercises the API.

## Stages

| # | Name | Description |
|---|------|-------------|
| 1 | Gather | Load built-in story doc; display as `overstandDocs` entries |
| 2 | Construct | Build logical facts + word model from gathered docs; show fact strings |
| 3 | Edit | Display knowledge graph (nodes + edges); drag/edit supported |
| 4 | Query | Accept plain-English question; return answer via construct logic |

## Frontend

- React + Vite, single-page, one tab per stage.
- State held in memory (React state); no database required.
- Entry: `src/main.jsx` → `src/App.jsx`

## Backend & API

- **Technology**: Vercel serverless functions (JavaScript, ES modules).
- **Hosting tier**: Free (Vercel Hobby).
- **Setup**: zero-config for local dev (`vercel dev`); config in `vercel.json`.
- **Endpoint**: `POST /api/query`

### `POST /api/query`

Request body (JSON):

```json
{
  "mode": "quick" | "deep" | "scenario",
  "prompt": "<question or partial sentence>",
  "facts": [{ "relation": "...", "args": ["..."] }],
  "wordModel": [...],
  "constraints": { "forbiddenWords": [], "forbiddenFacts": [] }
}
```

Response body (JSON):

```json
{ "answer": "<string>" }
```

- The function imports `answerQuery` directly from `src/overstand.js`
  (same module, no duplication).
- No authentication required for prototype.

## Testing

### Unit tests
`npm run test` — Node built-in test runner, `src/overstand.test.js`.

### End-to-end API test
`npm run test:e2e` — starts the API handler in-process, sends HTTP-like
calls, asserts responses. File: `src/api.e2e.test.js`.

### Full run
`npm run test:all` — runs unit tests then e2e tests sequentially.

## Technology Constraints

| Constraint | Choice |
|------------|--------|
| Language | JavaScript (ES modules) |
| Runtime | Node.js 20+ |
| Frontend bundler | Vite 8 |
| Serverless platform | Vercel (free tier) |
| Test runner | Node built-in (`node:test`) |
| Dependencies added | none |
