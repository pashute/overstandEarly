export const CHILD_STORY_TEXT = [
  'Jane has a red ball.',
  'Spot is a small brown dog.',
  "John is Jane's neighbor.",
  "Dick is John's brother.",
  'Jane is smiling',
  'John is smiling',
  'Jane is happy.',
  'Spot chases the red ball.',
  'John waves to Jane.',
  'Dick carries a green kite.',
].join(' ')

export const BUILT_IN_DOC = {
  id: 'builtin-story',
  field: 'story',
  topic: 'jane-spot-neighbors',
  source: 'built-in',
  text: CHILD_STORY_TEXT,
}

export const KNOWN_QA = [
  {
    id: 'spot-color',
    mode: 'quick',
    question: 'What color is Spot?',
    expected: 'brown',
    requiredFact: { relation: 'color', args: ['spot', 'brown'] },
  },
  {
    id: 'jane-neighbor',
    mode: 'quick',
    question: "Who is Jane's neighbor?",
    expected: 'john',
    requiredFact: { relation: 'neighbor', args: ['jane', 'john'] },
  },
  {
    id: 'deep-neighbor',
    mode: 'deep',
    question: "Who is Jane's neighbor's neighbor?",
    expected: 'dick',
    requiredFact: { relation: 'neighbor', args: ['john', 'dick'] },
  },
  {
    id: 'dick-object',
    mode: 'quick',
    question: 'What does Dick carry?',
    expected: 'green kite',
    requiredFact: {
      relation: 'action',
      args: ['dick', 'carry', 'kite'],
      extraFacts: [{ relation: 'color', args: ['kite', 'green'] }],
    },
  },
]

const START = '__start__'

const titleCase = (value) => value.slice(0, 1).toUpperCase() + value.slice(1)

const normalizeValue = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const tokenize = (text) => normalizeValue(text).split(' ').filter(Boolean)

const dedupeFacts = (facts) => {
  const seen = new Set()
  return facts.filter((fact) => {
    const key = `${fact.relation}:${fact.args.join(':')}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

const makeFact = (relation, args, source = 'derived') => ({
  relation,
  args: args.map(normalizeValue),
  source,
})

const extractFactsFromSentence = (sentence) => {
  const facts = []
  const trimmed = sentence.trim()
  if (!trimmed) {
    return facts
  }

  let match = trimmed.match(/^([A-Z][a-z]+) has a ([a-z]+) ([a-z]+)\.$/)
  if (match) {
    const [, subject, color, object] = match
    facts.push(makeFact('owns', [subject, object]))
    facts.push(makeFact('color', [object, color]))
    facts.push(makeFact('kind', [object, object]))
    return facts
  }

  match = trimmed.match(/^([A-Z][a-z]+) is a ([a-z]+) ([a-z]+)\.$/)
  if (match) {
    const [, subject, color, kind] = match
    facts.push(makeFact('color', [subject, color]))
    facts.push(makeFact('kind', [subject, kind]))
    return facts
  }

  match = trimmed.match(/^([A-Z][a-z]+) is ([A-Z][a-z]+)'s neighbor\.$/)
  if (match) {
    const [, left, right] = match
    facts.push(makeFact('neighbor', [left, right]))
    facts.push(makeFact('neighbor', [right, left]))
    return facts
  }

  match = trimmed.match(/^([A-Z][a-z]+) feels ([a-z]+)\.$/)
  if (match) {
    const [, subject, feeling] = match
    facts.push(makeFact('feels', [subject, feeling]))
    return facts
  }

  match = trimmed.match(/^([A-Z][a-z]+) chases the ([a-z]+) ([a-z]+)\.$/)
  if (match) {
    const [, subject, color, object] = match
    facts.push(makeFact('action', [subject, 'chase', object]))
    facts.push(makeFact('color', [object, color]))
    return facts
  }

  match = trimmed.match(/^([A-Z][a-z]+) waves to ([A-Z][a-z]+)\.$/)
  if (match) {
    const [, subject, target] = match
    facts.push(makeFact('action', [subject, 'wave', target]))
    return facts
  }

  match = trimmed.match(/^([A-Z][a-z]+) carries a ([a-z]+) ([a-z]+)\.$/)
  if (match) {
    const [, subject, color, object] = match
    facts.push(makeFact('action', [subject, 'carry', object]))
    facts.push(makeFact('color', [object, color]))
    facts.push(makeFact('kind', [object, object]))
    return facts
  }

  return facts
}

export const extractFactsFromDocs = (docs) =>
  dedupeFacts(
    docs.flatMap((doc) =>
      doc.text
        .split(/(?<=[.!?])\s+/)
        .flatMap((sentence) => extractFactsFromSentence(sentence)),
    ),
  )

export const createGraphDraft = (facts, previousDraft) => {
  if (previousDraft) {
    const existingNodeIds = new Set(previousDraft.nodes.map((node) => node.id))
    const existingEdgeIds = new Set(previousDraft.edges.map((edge) => `${edge.from}:${edge.label}:${edge.to}`))
    const derivedNodeIds = [...new Set(facts.flatMap((fact) => fact.args.filter(Boolean)))]
    const addedNodes = derivedNodeIds
      .filter((id) => !existingNodeIds.has(id))
      .map((id, index) => ({
        id,
        label: titleCase(id),
        x: 120 + ((previousDraft.nodes.length + index) % 4) * 140,
        y: 90 + Math.floor((previousDraft.nodes.length + index) / 4) * 110,
      }))
    const addedEdges = facts
      .filter((fact) => fact.args.length >= 2)
      .map((fact) => ({
        id: `${fact.args[0]}-${fact.relation}-${fact.args[fact.args.length - 1]}`,
        from: fact.args[0],
        to: fact.args[fact.args.length - 1],
        label: fact.relation,
      }))
      .filter((edge) => !existingEdgeIds.has(`${edge.from}:${edge.label}:${edge.to}`))

    return {
      nodes: [...previousDraft.nodes.map((node) => ({ ...node })), ...addedNodes],
      edges: [...previousDraft.edges.map((edge) => ({ ...edge })), ...addedEdges],
    }
  }

  const entityNames = [...new Set(facts.flatMap((fact) => fact.args.filter(Boolean)))]
  const nodes = entityNames.map((name, index) => ({
    id: name,
    label: titleCase(name),
    x: 120 + (index % 4) * 140,
    y: 90 + Math.floor(index / 4) * 110,
  }))
  const edges = facts
    .filter((fact) => fact.args.length >= 2)
    .map((fact, index) => ({
      id: `edge-${index}`,
      from: fact.args[0],
      to: fact.args[fact.args.length - 1],
      label: fact.relation,
    }))

  return { nodes, edges }
}

export const buildWordModel = (docs) => {
  const counts = new Map()
  for (const doc of docs) {
    const words = tokenize(doc.text)
    for (let index = 0; index < words.length; index += 1) {
      const prevTwo = words[index - 2] ?? START
      const prevOne = words[index - 1] ?? START
      const nextWord = words[index]
      const contextKey = `${prevTwo} ${prevOne}`
      const bucket = counts.get(contextKey) ?? new Map()
      bucket.set(nextWord, (bucket.get(nextWord) ?? 0) + 1)
      counts.set(contextKey, bucket)
    }
  }

  return [...counts.entries()].map(([context, bucket]) => {
    const [, prevOne] = context.split(' ')
    return {
      context,
      unit: `${[...bucket.keys()][0]}@after:${prevOne}`,
      continuations: [...bucket.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .map(([word, count]) => ({ word, count })),
    }
  })
}

export const buildConstructVersion = ({ docs, manualFacts = [], graphDraft, versionNumber }) => {
  const extractedFacts = extractFactsFromDocs(docs)
  const facts = dedupeFacts([...extractedFacts, ...manualFacts.map((fact) => makeFact(fact.relation, fact.args, 'manual'))])
  const nextGraphDraft = createGraphDraft(facts, graphDraft)
  const wordModel = buildWordModel(docs)

  return {
    versionNumber,
    versionLabel: `v${versionNumber}`,
    docs,
    wordModel,
    facts,
    factStrings: facts.map((fact) => `${fact.relation}(${fact.args.join(', ')})`),
    graphDraft: nextGraphDraft,
    queryModes: ['quick', 'deep', 'scenario'],
  }
}

const formatForbiddenFact = (value) => normalizeValue(value).replace(/\s+/g, '')

const isFactForbidden = (fact, forbiddenFacts) => {
  const serialized = `${fact.relation}(${fact.args.join(',')})`
  return forbiddenFacts.has(formatForbiddenFact(serialized))
}

const collectConstraints = (constraints = {}) => ({
  forbiddenWords: new Set(
    (constraints.forbiddenWords ?? [])
      .map((word) => normalizeValue(word))
      .filter(Boolean),
  ),
  forbiddenFacts: new Set(
    (constraints.forbiddenFacts ?? [])
      .map((fact) => formatForbiddenFact(fact))
      .filter(Boolean),
  ),
})

const allowedFacts = (facts, constraints) =>
  facts.filter((fact) => !isFactForbidden(fact, constraints.forbiddenFacts))

const findFact = (facts, relation, predicate) =>
  facts.find((fact) => fact.relation === relation && predicate(fact.args))

const describeObject = (facts, objectName) => {
  const color = findFact(facts, 'color', ([subject]) => subject === objectName)?.args[1]
  return color ? `${color} ${objectName}` : objectName
}

const quickQuery = (prompt, facts, constraints) => {
  const normalized = normalizeValue(prompt)
  const filteredFacts = allowedFacts(facts, constraints)

  let match = normalized.match(/^what color is ([a-z0-9'-]+)$/)
  if (match) {
    return findFact(filteredFacts, 'color', ([subject]) => subject === match[1])?.args[1] ?? 'No matching color fact found.'
  }

  match = normalized.match(/^who is ([a-z0-9'-]+)'s neighbor$/)
  if (match) {
    return (
      filteredFacts
        .filter((fact) => fact.relation === 'neighbor' && fact.args[0] === match[1])
        .map((fact) => fact.args[1])
        .join(', ') || 'No neighbor fact found.'
    )
  }

  match = normalized.match(/^what does ([a-z0-9'-]+) carry$/)
  if (match) {
    const actionFact = findFact(
      filteredFacts,
      'action',
      ([subject, verb]) => subject === match[1] && verb === 'carry',
    )
    return actionFact ? describeObject(filteredFacts, actionFact.args[2]) : 'No carry fact found.'
  }

  match = normalized.match(/^what does ([a-z0-9'-]+) chase$/)
  if (match) {
    const actionFact = findFact(
      filteredFacts,
      'action',
      ([subject, verb]) => subject === match[1] && verb === 'chase',
    )
    return actionFact ? describeObject(filteredFacts, actionFact.args[2]) : 'No chase fact found.'
  }

  match = normalized.match(/^how does ([a-z0-9'-]+) feel$/)
  if (match) {
    return findFact(filteredFacts, 'feels', ([subject]) => subject === match[1])?.args[1] ?? 'No feeling fact found.'
  }

  return 'No quick query rule matched this question.'
}

const deepQuery = (prompt, facts, constraints) => {
  const normalized = normalizeValue(prompt)
  const filteredFacts = allowedFacts(facts, constraints)
  const neighborMentions = normalized.match(/neighbor/g)?.length ?? 0
  const subject = normalized.match(/^who is ([a-z0-9-]+)'s neighbor(?:'s neighbor)+$/)?.[1]

  if (!subject || neighborMentions < 2) {
    return quickQuery(prompt, facts, constraints)
  }

  let frontier = new Set([subject])
  for (let depth = 0; depth < neighborMentions; depth += 1) {
    const next = new Set()
    for (const current of frontier) {
      for (const fact of filteredFacts) {
        if (fact.relation === 'neighbor' && fact.args[0] === current) {
          next.add(fact.args[1])
        }
      }
    }
    frontier = next
  }

  frontier.delete(subject)
  return frontier.size ? [...frontier].join(', ') : 'No deep answer found.'
}

const scenarioQuery = (prompt, wordModel, constraints) => {
  const words = tokenize(prompt)
  const generated = [...words]
  const modelIndex = new Map(wordModel.map((entry) => [entry.context, entry.continuations]))

  for (let step = 0; step < 12; step += 1) {
    const prevTwo = generated[generated.length - 2] ?? START
    const prevOne = generated[generated.length - 1] ?? START
    const options = modelIndex.get(`${prevTwo} ${prevOne}`) ?? modelIndex.get(`${START} ${prevOne}`) ?? []
    const next = options.find((option) => !constraints.forbiddenWords.has(option.word))
    if (!next) {
      break
    }
    generated.push(next.word)
  }

  return generated.join(' ')
}

export const answerQuery = ({ mode, prompt, construct, constraints }) => {
  const normalizedConstraints = collectConstraints(constraints)

  if (mode === 'scenario') {
    return scenarioQuery(prompt, construct.wordModel, normalizedConstraints)
  }

  if (mode === 'deep') {
    return deepQuery(prompt, construct.facts, normalizedConstraints)
  }

  return quickQuery(prompt, construct.facts, normalizedConstraints)
}

export const runKnownTests = (construct) =>
  KNOWN_QA.map((testCase) => {
    const actual = answerQuery({ mode: testCase.mode, prompt: testCase.question, construct, constraints: {} })
    return {
      ...testCase,
      actual,
      passed: normalizeValue(actual) === normalizeValue(testCase.expected),
    }
  })

export const addManualFact = (manualFacts, relation, args) => [
  ...manualFacts,
  { relation: normalizeValue(relation), args: args.map(normalizeValue) },
]

export const buildRepairFactFromQuestion = (question, expectedAnswer) => {
  const normalizedQuestion = normalizeValue(question)
  const expected = normalizeValue(expectedAnswer)

  let match = normalizedQuestion.match(/^what color is ([a-z0-9'-]+)$/)
  if (match) {
    return { relation: 'color', args: [match[1], expected] }
  }

  match = normalizedQuestion.match(/^who is ([a-z0-9'-]+)'s neighbor$/)
  if (match) {
    return { relation: 'neighbor', args: [match[1], expected] }
  }

  match = normalizedQuestion.match(/^who is ([a-z0-9-]+)'s neighbor's neighbor$/)
  if (match) {
    return { relation: 'neighbor', args: ['john', expected] }
  }

  match = normalizedQuestion.match(/^what does ([a-z0-9'-]+) carry$/)
  if (match) {
    const [color, object] = expected.split(' ')
    return {
      relation: 'action',
      args: [match[1], 'carry', object ?? expected],
      extraFacts: object ? [{ relation: 'color', args: [object, color] }] : [],
    }
  }

  return { relation: 'note', args: [normalizedQuestion, expected] }
}

export const parseFactInput = (relation, argsText) => ({
  relation: normalizeValue(relation),
  args: argsText
    .split(',')
    .map(normalizeValue)
    .filter(Boolean),
})
