# Folder Structure

```
overstandEarly/
├── api/
│   └── query.js            Vercel serverless function — POST /api/query
├── src/
│   ├── main.jsx            React entry point
│   ├── App.jsx             Top-level component; tabs for all four stages
│   ├── App.css             App-level styles
│   ├── index.css           Global styles
│   ├── overstand.js        Core logic: fact extraction, construct builder,
│   │                       query engine, word model
│   ├── overstand.test.js   Unit tests (Node built-in runner)
│   ├── api.e2e.test.js     End-to-end tests for the API handler (in-process)
│   └── dev/
│       └── specs/
│           ├── prototype1.md      Prototype 1 spec (stages, API, tech choices)
│           ├── specifications.md  Full app specification (all stages)
│           ├── brain.md           Brain module architecture
│           ├── installHowto.md    Developer install & run guide (this file's sibling)
│           └── folderStructure.md This file
├── index.html              Vite HTML entry
├── vite.config.js          Vite configuration (React plugin)
├── vercel.json             Vercel routing config
├── package.json            Scripts, dependencies
└── .gitignore
```

## Key modules

| File | Role |
|------|------|
| `src/overstand.js` | All domain logic; imported by UI and API handler |
| `src/App.jsx` | Four-tab UI shell |
| `api/query.js` | Thin HTTP wrapper around `answerQuery` |
| `src/dev/specs/` | Living specs and developer docs |
