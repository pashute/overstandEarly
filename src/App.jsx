import { useMemo, useState } from 'react'
import './App.css'
import {
  BUILT_IN_DOC,
  CHILD_STORY_TEXT,
  addManualFact,
  answerQuery,
  buildConstructVersion,
  buildRepairFactFromQuestion,
  parseFactInput,
  runKnownTests,
} from './overstand.js'

const tabs = ['Gather', 'Construct', 'Edit', 'Query']

const createInitialConstruct = () => buildConstructVersion({ docs: [], manualFacts: [], versionNumber: 1 })

const blankNode = { label: '', x: 320, y: 180 }
const blankEdge = { from: '', to: '', label: '' }

function App() {
  const [activeTab, setActiveTab] = useState('Gather')
  const [docs, setDocs] = useState([])
  const [manualFacts, setManualFacts] = useState([])
  const [constructVersions, setConstructVersions] = useState([createInitialConstruct()])
  const [urlInput, setUrlInput] = useState('https://en.wikipedia.org/wiki/Dog')
  const [gatherStatus, setGatherStatus] = useState('')
  const [factRelation, setFactRelation] = useState('color')
  const [factArgs, setFactArgs] = useState('spot, blue')
  const [queryMode, setQueryMode] = useState('quick')
  const [queryPrompt, setQueryPrompt] = useState('What color is Spot?')
  const [forbiddenWordsText, setForbiddenWordsText] = useState('')
  const [forbiddenFactsText, setForbiddenFactsText] = useState('')
  const [queryResult, setQueryResult] = useState('')
  const [learnRelation, setLearnRelation] = useState('neighbor')
  const [learnArgs, setLearnArgs] = useState('jane, john')
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [nodeDraft, setNodeDraft] = useState(blankNode)
  const [edgeDraft, setEdgeDraft] = useState(blankEdge)
  const [clipboardNode, setClipboardNode] = useState(null)
  const [zoom, setZoom] = useState(1)

  const currentConstruct = constructVersions.at(-1)
  const testResults = useMemo(() => runKnownTests(currentConstruct), [currentConstruct])
  const failingTests = testResults.filter((result) => !result.passed)
  const selectedNode = currentConstruct.graphDraft.nodes.find((node) => node.id === selectedNodeId) ?? null

  const pushVersion = (nextDocs, nextManualFacts, graphDraft) => {
    setConstructVersions((versions) => [
      ...versions,
      buildConstructVersion({
        docs: nextDocs,
        manualFacts: nextManualFacts,
        graphDraft,
        versionNumber: versions.length + 1,
      }),
    ])
  }

  const handleUseBuiltInStory = () => {
    const nextDocs = [BUILT_IN_DOC]
    setDocs(nextDocs)
    pushVersion(nextDocs, manualFacts, currentConstruct.graphDraft)
    setGatherStatus('Loaded the built-in child story into overstandDocs as { story :: jane-spot-neighbors }.')
  }

  const handleFetchWikipedia = async () => {
    try {
      const topic = urlInput.split('/wiki/')[1]
      if (!topic) {
        throw new Error('Enter a Wikipedia article URL in /wiki/Topic form.')
      }

      const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${topic}`)
      if (!response.ok) {
        throw new Error(`Wikipedia fetch failed with status ${response.status}.`)
      }

      const data = await response.json()
      const nextDocs = [
        ...docs,
        {
          id: `wiki-${topic}`,
          field: 'wikipedia',
          topic: topic.replaceAll('_', '-').toLowerCase(),
          source: urlInput,
          text: data.extract ?? '',
        },
      ]

      setDocs(nextDocs)
      pushVersion(nextDocs, manualFacts, currentConstruct.graphDraft)
      setGatherStatus(`Fetched Wikipedia summary into { wikipedia :: ${topic.replaceAll('_', '-').toLowerCase()} }.`)
    } catch (error) {
      setGatherStatus(error.message)
    }
  }

  const handleAddFact = () => {
    const parsed = parseFactInput(factRelation, factArgs)
    if (!parsed.relation || parsed.args.length === 0) {
      return
    }

    const nextManualFacts = addManualFact(manualFacts, parsed.relation, parsed.args)
    setManualFacts(nextManualFacts)
    pushVersion(docs, nextManualFacts, currentConstruct.graphDraft)
  }

  const applyRepair = (testCase) => {
    const repair = testCase.requiredFact ?? buildRepairFactFromQuestion(testCase.question, testCase.expected)
    let nextManualFacts = addManualFact(manualFacts, repair.relation, repair.args)
    for (const extraFact of repair.extraFacts ?? []) {
      nextManualFacts = addManualFact(nextManualFacts, extraFact.relation, extraFact.args)
    }
    setManualFacts(nextManualFacts)
    pushVersion(docs, nextManualFacts, currentConstruct.graphDraft)
  }

  const runQuery = () => {
    setQueryResult(
      answerQuery({
        mode: queryMode,
        prompt: queryPrompt,
        construct: currentConstruct,
        constraints: {
          forbiddenWords: forbiddenWordsText.split(','),
          forbiddenFacts: forbiddenFactsText.split(','),
        },
      }),
    )
  }

  const learnAtQueryTime = () => {
    const parsed = parseFactInput(learnRelation, learnArgs)
    if (!parsed.relation || parsed.args.length === 0) {
      return
    }

    const nextManualFacts = addManualFact(manualFacts, parsed.relation, parsed.args)
    setManualFacts(nextManualFacts)
    pushVersion(docs, nextManualFacts, currentConstruct.graphDraft)
  }

  const updateGraph = (updater) => {
    const nextGraphDraft = updater(currentConstruct.graphDraft)
    pushVersion(docs, manualFacts, nextGraphDraft)
  }

  const addGraphNode = () => {
    if (!nodeDraft.label.trim()) {
      return
    }

    updateGraph((draft) => ({
      ...draft,
      nodes: [
        ...draft.nodes,
        {
          id: `${nodeDraft.label.toLowerCase().replace(/\s+/g, '-')}-${draft.nodes.length + 1}`,
          label: nodeDraft.label,
          x: Number(nodeDraft.x),
          y: Number(nodeDraft.y),
        },
      ],
    }))
    setNodeDraft(blankNode)
  }

  const addGraphEdge = () => {
    if (!edgeDraft.from || !edgeDraft.to || !edgeDraft.label) {
      return
    }

    updateGraph((draft) => ({
      ...draft,
      edges: [...draft.edges, { id: `edge-${draft.edges.length + 1}`, ...edgeDraft }],
    }))
    setEdgeDraft(blankEdge)
  }

  const moveSelectedNode = (deltaX, deltaY) => {
    if (!selectedNodeId) {
      return
    }

    updateGraph((draft) => ({
      ...draft,
      nodes: draft.nodes.map((node) =>
        node.id === selectedNodeId
          ? { ...node, x: node.x + deltaX, y: node.y + deltaY }
          : node,
      ),
    }))
  }

  const scaleSelectedNode = (factor) => {
    if (!selectedNodeId) {
      return
    }

    updateGraph((draft) => ({
      ...draft,
      nodes: draft.nodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              x: 320 + (node.x - 320) * factor,
              y: 180 + (node.y - 180) * factor,
            }
          : node,
      ),
    }))
  }

  const deleteSelectedNode = () => {
    if (!selectedNodeId) {
      return
    }

    updateGraph((draft) => ({
      nodes: draft.nodes.filter((node) => node.id !== selectedNodeId),
      edges: draft.edges.filter((edge) => edge.from !== selectedNodeId && edge.to !== selectedNodeId),
    }))
    setSelectedNodeId('')
  }

  const copySelectedNode = () => {
    if (selectedNode) {
      setClipboardNode(selectedNode)
    }
  }

  const cutSelectedNode = () => {
    if (selectedNode) {
      setClipboardNode(selectedNode)
      deleteSelectedNode()
    }
  }

  const pasteNode = () => {
    if (!clipboardNode) {
      return
    }

    updateGraph((draft) => ({
      ...draft,
      nodes: [
        ...draft.nodes,
        {
          ...clipboardNode,
          id: `${clipboardNode.id}-copy-${draft.nodes.length + 1}`,
          label: `${clipboardNode.label} copy`,
          x: clipboardNode.x + 30,
          y: clipboardNode.y + 30,
        },
      ],
    }))
  }

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">overstand</p>
          <h1>Human-verifiable constructs from source text</h1>
          <p>
            Build versioned word models and formal facts, edit them visually, and query them without AI at runtime.
          </p>
        </div>
        <div className="version-card">
          <strong>{currentConstruct.versionLabel}</strong>
          <span>{currentConstruct.docs.length} docs</span>
          <span>{currentConstruct.facts.length} facts</span>
          <span>{currentConstruct.wordModel.length} contexts</span>
        </div>
      </header>

      <nav className="tabs" aria-label="Stages">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={tab === activeTab ? 'tab active' : 'tab'}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === 'Gather' && (
        <section className="panel-grid">
          <article className="panel">
            <h2>Stage 1 — Gather</h2>
            <p>Load the built-in child story or fetch a Wikipedia summary into <code>overstandDocs</code>.</p>
            <div className="stack">
              <button type="button" onClick={handleUseBuiltInStory}>
                Load built-in child story
              </button>
              <textarea value={CHILD_STORY_TEXT} readOnly rows={7} />
              <label>
                Wikipedia URL
                <input value={urlInput} onChange={(event) => setUrlInput(event.target.value)} />
              </label>
              <button type="button" onClick={handleFetchWikipedia}>
                Fetch Wikipedia summary
              </button>
              {gatherStatus ? <p className="status">{gatherStatus}</p> : null}
            </div>
          </article>

          <article className="panel">
            <h2>overstandDocs</h2>
            <div className="list-block">
              {docs.length === 0 ? <p>No gathered docs yet.</p> : null}
              {docs.map((doc) => (
                <details key={doc.id} open>
                  <summary>{`{ ${doc.field} :: ${doc.topic} }`}</summary>
                  <p>{doc.text}</p>
                </details>
              ))}
            </div>
          </article>
        </section>
      )}

      {activeTab === 'Construct' && (
        <section className="panel-grid">
          <article className="panel">
            <h2>Stage 2 — Construct</h2>
            <div className="stack">
              <div>
                <h3>Word model</h3>
                <ul className="compact-list">
                  {currentConstruct.wordModel.slice(0, 8).map((entry) => (
                    <li key={entry.context}>
                      <code>{entry.unit}</code> → {entry.continuations.map((item) => `${item.word} (${item.count})`).join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Logical constructs</h3>
                <ul className="compact-list">
                  {currentConstruct.factStrings.map((fact) => (
                    <li key={fact}>
                      <code>{fact}</code>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Learning on the fly</h3>
                <label>
                  Relation
                  <input value={factRelation} onChange={(event) => setFactRelation(event.target.value)} />
                </label>
                <label>
                  Args (comma separated)
                  <input value={factArgs} onChange={(event) => setFactArgs(event.target.value)} />
                </label>
                <button type="button" onClick={handleAddFact}>
                  Add fact and create new version
                </button>
              </div>
            </div>
          </article>

          <article className="panel">
            <h2>Test &amp; fix</h2>
            <p>{failingTests.length === 0 ? 'All known checks pass.' : `${failingTests.length} known checks need repair.`}</p>
            <ul className="compact-list">
              {testResults.map((result) => (
                <li key={result.id} className={result.passed ? 'pass' : 'fail'}>
                  <strong>{result.passed ? 'PASS' : 'FAIL'}</strong> {result.question} → expected <code>{result.expected}</code>, got{' '}
                  <code>{result.actual}</code>
                  {!result.passed ? (
                    <button type="button" onClick={() => applyRepair(result)}>
                      Repair into v{constructVersions.length + 1}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </article>
        </section>
      )}

      {activeTab === 'Edit' && (
        <section className="panel-grid">
          <article className="panel">
            <h2>Stage 3 — Edit</h2>
            <div className="stack two-col">
              <div>
                <label>
                  New node label
                  <input
                    value={nodeDraft.label}
                    onChange={(event) => setNodeDraft((draft) => ({ ...draft, label: event.target.value }))}
                  />
                </label>
                <label>
                  X
                  <input
                    type="number"
                    value={nodeDraft.x}
                    onChange={(event) => setNodeDraft((draft) => ({ ...draft, x: Number(event.target.value) }))}
                  />
                </label>
                <label>
                  Y
                  <input
                    type="number"
                    value={nodeDraft.y}
                    onChange={(event) => setNodeDraft((draft) => ({ ...draft, y: Number(event.target.value) }))}
                  />
                </label>
                <button type="button" onClick={addGraphNode}>
                  Add node
                </button>
              </div>
              <div>
                <label>
                  Edge from
                  <input value={edgeDraft.from} onChange={(event) => setEdgeDraft((draft) => ({ ...draft, from: event.target.value }))} />
                </label>
                <label>
                  Edge to
                  <input value={edgeDraft.to} onChange={(event) => setEdgeDraft((draft) => ({ ...draft, to: event.target.value }))} />
                </label>
                <label>
                  Label
                  <input value={edgeDraft.label} onChange={(event) => setEdgeDraft((draft) => ({ ...draft, label: event.target.value }))} />
                </label>
                <button type="button" onClick={addGraphEdge}>
                  Add connection
                </button>
              </div>
            </div>
            <div className="stack button-row">
              <button type="button" onClick={() => moveSelectedNode(-20, 0)}>
                Move left
              </button>
              <button type="button" onClick={() => moveSelectedNode(20, 0)}>
                Move right
              </button>
              <button type="button" onClick={() => moveSelectedNode(0, -20)}>
                Move up
              </button>
              <button type="button" onClick={() => moveSelectedNode(0, 20)}>
                Move down
              </button>
              <button type="button" onClick={() => scaleSelectedNode(0.85)}>
                Move closer
              </button>
              <button type="button" onClick={() => scaleSelectedNode(1.15)}>
                Move farther
              </button>
              <button type="button" onClick={copySelectedNode}>
                Copy
              </button>
              <button type="button" onClick={cutSelectedNode}>
                Cut
              </button>
              <button type="button" onClick={pasteNode}>
                Paste
              </button>
              <button type="button" onClick={deleteSelectedNode}>
                Delete
              </button>
            </div>
            <label>
              Zoom
              <input type="range" min="0.6" max="1.6" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
            </label>
          </article>

          <article className="panel">
            <h2>Construct graph</h2>
            <div className="graph-frame">
              <svg viewBox="0 0 640 360" style={{ transform: `scale(${zoom})` }}>
                {currentConstruct.graphDraft.edges.map((edge) => {
                  const from = currentConstruct.graphDraft.nodes.find((node) => node.id === edge.from)
                  const to = currentConstruct.graphDraft.nodes.find((node) => node.id === edge.to)
                  if (!from || !to) {
                    return null
                  }
                  return (
                    <g key={edge.id}>
                      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
                      <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 6}>
                        {edge.label}
                      </text>
                    </g>
                  )
                })}
                {currentConstruct.graphDraft.nodes.map((node) => (
                  <g key={node.id} onClick={() => setSelectedNodeId(node.id)} className={node.id === selectedNodeId ? 'selected-node' : ''}>
                    <circle cx={node.x} cy={node.y} r="24" />
                    <text x={node.x} y={node.y + 4} textAnchor="middle">
                      {node.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
            <p>{selectedNode ? `Selected: ${selectedNode.label}` : 'Select a node to move, copy, cut, paste, or delete it.'}</p>
          </article>
        </section>
      )}

      {activeTab === 'Query' && (
        <section className="panel-grid">
          <article className="panel">
            <h2>Stage 4 — Query</h2>
            <div className="stack">
              <label>
                Mode
                <select value={queryMode} onChange={(event) => setQueryMode(event.target.value)}>
                  {currentConstruct.queryModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Plain-English query
                <input value={queryPrompt} onChange={(event) => setQueryPrompt(event.target.value)} />
              </label>
              <label>
                Forbidden words
                <input value={forbiddenWordsText} onChange={(event) => setForbiddenWordsText(event.target.value)} />
              </label>
              <label>
                Forbidden facts
                <input value={forbiddenFactsText} onChange={(event) => setForbiddenFactsText(event.target.value)} />
              </label>
              <button type="button" onClick={runQuery}>
                Run query without AI
              </button>
              {queryResult ? <p className="result">{queryResult}</p> : null}
            </div>
          </article>

          <article className="panel">
            <h2>Repair / learn at query time</h2>
            <p>Accepted changes create a fresh construct version.</p>
            <label>
              Relation
              <input value={learnRelation} onChange={(event) => setLearnRelation(event.target.value)} />
            </label>
            <label>
              Args (comma separated)
              <input value={learnArgs} onChange={(event) => setLearnArgs(event.target.value)} />
            </label>
            <button type="button" onClick={learnAtQueryTime}>
              Learn fact now
            </button>
            <h3>Version history</h3>
            <ul className="compact-list">
              {constructVersions.map((version) => (
                <li key={version.versionLabel}>
                  <strong>{version.versionLabel}</strong> — {version.docs.length} docs, {version.facts.length} facts
                </li>
              ))}
            </ul>
          </article>
        </section>
      )}
    </div>
  )
}

export default App
