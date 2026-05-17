/**
 * Delete all documents in `pins` and `subscribers` (admin SDK).
 * Usage: node scripts/delete-firestore-pins.mjs
 * Requires: gcloud auth application-default login (or GOOGLE_APPLICATION_CREDENTIALS)
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import admin from 'firebase-admin'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadProjectId() {
  const envPath = resolve(root, '.env')
  if (!existsSync(envPath)) {
    throw new Error('Missing .env with VITE_FIREBASE_PROJECT_ID')
  }
  const text = readFileSync(envPath, 'utf8')
  const match = text.match(/^VITE_FIREBASE_PROJECT_ID=(.+)$/m)
  if (!match?.[1]) throw new Error('VITE_FIREBASE_PROJECT_ID not set in .env')
  return match[1].trim()
}

const projectId = loadProjectId()

if (!admin.apps.length) {
  admin.initializeApp({ projectId })
}

const db = admin.firestore()

async function deleteCollection(name) {
  const snap = await db.collection(name).get()
  if (snap.empty) {
    console.log(`${name}: (empty)`)
    return 0
  }
  const batch = db.batch()
  snap.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()
  console.log(`${name}: deleted ${snap.size} document(s)`)
  snap.docs.forEach((doc) => {
    const d = doc.data()
    const label =
      name === 'pins'
        ? `${d.city ?? '?'}, ${d.country ?? '?'}`
        : `${[d.firstName, d.lastName].filter(Boolean).join(' ') || d.name || '?'} <${d.email ?? '?'}>`
    console.log(`  - ${doc.id}: ${label}`)
  })
  return snap.size
}

const pinCount = await deleteCollection('pins')
const subCount = await deleteCollection('subscribers')
console.log(`Done. Removed ${pinCount} pin(s) and ${subCount} subscriber(s).`)
