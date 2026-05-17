/**
 * Deploy firestore.rules via Firebase Rules API (uses gcloud ADC).
 * Usage: node scripts/deploy-firestore-rules.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const projectId = (() => {
  const envPath = resolve(root, '.env')
  const text = readFileSync(envPath, 'utf8')
  const match = text.match(/^VITE_FIREBASE_PROJECT_ID=(.+)$/m)
  if (!match?.[1]) throw new Error('VITE_FIREBASE_PROJECT_ID missing in .env')
  return match[1].trim()
})()

const rulesPath = resolve(root, 'firestore.rules')
if (!existsSync(rulesPath)) throw new Error('firestore.rules not found')
const rulesContent = readFileSync(rulesPath, 'utf8')

const token = execSync('gcloud auth application-default print-access-token', {
  encoding: 'utf8',
}).trim()

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
}

const createRes = await fetch(
  `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
  {
    method: 'POST',
    headers,
    body: JSON.stringify({
      source: { files: [{ name: 'firestore.rules', content: rulesContent }] },
    }),
  },
)

if (!createRes.ok) {
  const err = await createRes.text()
  throw new Error(`Create ruleset failed (${createRes.status}): ${err}`)
}

const ruleset = await createRes.json()
const rulesetName = ruleset.name
console.log(`Created ruleset: ${rulesetName}`)

const releaseRes = await fetch(
  `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`,
  {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      release: {
        name: `projects/${projectId}/releases/cloud.firestore`,
        rulesetName,
      },
    }),
  },
)

if (!releaseRes.ok) {
  const err = await releaseRes.text()
  throw new Error(`Release rules failed (${releaseRes.status}): ${err}`)
}

const release = await releaseRes.json()
console.log(`Firestore rules published: ${release.name}`)
