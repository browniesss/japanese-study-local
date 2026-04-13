import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.cwd())
const sourceDir = path.join(root, 'content')
const targetDir = path.join(root, 'public', 'content')

if (!fs.existsSync(path.join(sourceDir, 'manifest.json'))) {
  console.error('content/manifest.json is missing. Run "npm run content:bootstrap" first.')
  process.exit(1)
}

fs.rmSync(targetDir, { recursive: true, force: true })
fs.mkdirSync(path.dirname(targetDir), { recursive: true })
fs.cpSync(sourceDir, targetDir, { recursive: true })

console.log(`Synced ${sourceDir} -> ${targetDir}`)
