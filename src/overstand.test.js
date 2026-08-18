import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BUILT_IN_DOC,
  addManualFact,
  answerQuery,
  buildConstructVersion,
  buildRepairFactFromQuestion,
  runKnownTests,
} from './overstand.js'

test('builds known facts from the child story', () => {
  const construct = buildConstructVersion({ docs: [BUILT_IN_DOC], versionNumber: 1 })
  assert.equal(answerQuery({ mode: 'quick', prompt: 'What color is Spot?', construct, constraints: {} }), 'blue')
  assert.equal(answerQuery({ mode: 'deep', prompt: "Who is Jane's neighbor's neighbor?", construct, constraints: {} }), 'dick')
})

test('scenario generation respects forbidden words', () => {
  const construct = buildConstructVersion({ docs: [BUILT_IN_DOC], versionNumber: 1 })
  const result = answerQuery({
    mode: 'scenario',
    prompt: 'jane has a',
    construct,
    constraints: { forbiddenWords: ['red'] },
  })
  assert.ok(!result.includes('red'))
})

test('known tests pass and repairs can add facts', () => {
  const emptyConstruct = buildConstructVersion({ docs: [], versionNumber: 1 })
  assert.ok(runKnownTests(emptyConstruct).some((result) => !result.passed))

  const repair = buildRepairFactFromQuestion('What color is Spot?', 'blue')
  const manualFacts = addManualFact([], repair.relation, repair.args)
  const repairedConstruct = buildConstructVersion({ docs: [], manualFacts, versionNumber: 2 })
  assert.equal(answerQuery({ mode: 'quick', prompt: 'What color is Spot?', construct: repairedConstruct, constraints: {} }), 'blue')
})
