import { answerQuery } from '../src/overstand.js'

/**
 * POST /api/query
 *
 * Body: { mode, prompt, facts, wordModel, constraints }
 * Response: { answer }
 */
export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { mode, prompt, facts = [], wordModel = [], constraints = {} } = req.body ?? {}

  if (!mode || !prompt) {
    res.status(400).json({ error: 'mode and prompt are required' })
    return
  }

  const construct = { facts, wordModel, queryModes: ['quick', 'deep', 'scenario'] }
  const answer = answerQuery({ mode, prompt, construct, constraints })
  res.status(200).json({ answer })
}
