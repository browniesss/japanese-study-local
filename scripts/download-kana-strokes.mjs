import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const outputDir = path.join(projectRoot, 'public', 'kana-strokes')

const kanaGroups = [
  'あいうえお',
  'かきくけこ',
  'さしすせそ',
  'たちつてと',
  'なにぬねの',
  'はひふへほ',
  'まみむめも',
  'やゆよ',
  'らりるれろ',
  'わをん',
  'アイウエオ',
  'カキクケコ',
  'サシスセソ',
  'タチツテト',
  'ナニヌネノ',
  'ハヒフヘホ',
  'マミムメモ',
  'ヤユヨ',
  'ラリルレロ',
  'ワヲン',
]

const kanaList = [...new Set(kanaGroups.join('').split(''))]

await mkdir(outputDir, { recursive: true })

for (const kana of kanaList) {
  const codePoint = kana.codePointAt(0)
  const sourceUrl = `https://raw.githubusercontent.com/parsimonhi/animCJK/master/svgsJaKana/${codePoint}.svg`
  const response = await fetch(sourceUrl, {
    headers: {
      'User-Agent': 'japanese-study-local/1.0',
    },
  })

  if (!response.ok) {
    throw new Error(`failed_to_download_${kana}_${codePoint}_${response.status}`)
  }

  const svg = await response.text()
  await writeFile(path.join(outputDir, `${codePoint}.svg`), svg, 'utf8')
  console.log(`downloaded ${kana} -> ${codePoint}.svg`)
}

console.log(`done: ${kanaList.length} kana stroke files saved to ${outputDir}`)
