/**
 * End-to-end API tests for POST /api/query
 *
 * Exercises the Vercel handler function in-process — no HTTP server needed.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/query.js'
import { buildConstructVersion, BUILT_IN_DOC } from './overstand.js'

const construct = buildConstructVersion({ docs: [BUILT_IN_DOC], versionNumber: 1 })

function makeReqRes(body) {
  const req = { method: 'POST', body }
  const captured = {}
  const res = {
    status(code) {
      captured.status = code
      return res
    },
    json(data) {
      captured.body = data
      return res
    },
  }
  return { req, res, captured }
}

test('quick query returns correct answer', () => {
  const { req, res, captured } = makeReqRes({
    mode: 'quick',
    prompt: 'What color is Spot?',
    facts: construct.facts,
    wordModel: construct.wordModel,
    constraints: {},
  })
  handler(req, res)
  assert.equal(captured.status, 200)
  assert.equal(captured.body.answer, 'blue')
})

test('deep query resolves neighbor chain', () => {
  const { req, res, captured } = makeReqRes({
    mode: 'deep',
    prompt: "Who is Jane's neighbor's neighbor?",
    facts: construct.facts,
    wordModel: construct.wordModel,
    constraints: {},
  })
  handler(req, res)
  assert.equal(captured.status, 200)
  assert.equal(captured.body.answer, 'dick')
})

test('scenario query respects forbidden words', () => {
  const { req, res, captured } = makeReqRes({
    mode: 'scenario',
    prompt: 'jane has a',
    facts: construct.facts,
    wordModel: construct.wordModel,
    constraints: { forbiddenWords: ['red'] },
  })
  handler(req, res)
  assert.equal(captured.status, 200)
  assert.ok(!captured.body.answer.includes('red'), 'answer must not contain forbidden word')
})

test('missing mode returns 400', () => {
  const { req, res, captured } = makeReqRes({ prompt: 'hello' })
  handler(req, res)
  assert.equal(captured.status, 400)
})

test('missing prompt returns 400', () => {
  const { req, res, captured } = makeReqRes({ mode: 'quick' })
  handler(req, res)
  assert.equal(captured.status, 400)
})

test('non-POST method returns 405', () => {
  const req = { method: 'GET', body: {} }
  const captured = {}
  const res = {
    status(code) { captured.status = code; return res },
    json(data) { captured.body = data; return res },
  }
  handler(req, res)
  assert.equal(captured.status, 405)
})
