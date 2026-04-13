import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.cwd())
const contentDir = path.join(root, 'content')
const manifestPath = path.join(contentDir, 'manifest.json')
const audioCatalogPath = path.join(root, 'src', 'data', 'audioCatalog.ts')
const starterAudioDir = path.join(root, 'public', 'audio', 'starter')

const duplicatedEndingPatterns = [
  /입니다\s*입니다/g,
  /합니다\s*합니다/g,
  /요\s*요/g,
  /이에요\s*이에요/g,
  /예요\s*예요/g,
]

const issues = []

function report(file, message) {
  issues.push(`${file}: ${message}`)
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function scanStrings(value, visitor, trace = 'root') {
  if (typeof value === 'string') {
    visitor(value, trace)
    return
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanStrings(entry, visitor, `${trace}[${index}]`))
    return
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) => scanStrings(entry, visitor, `${trace}.${key}`))
  }
}

function checkStringQuality(file, value, trace) {
  if (/\s{2,}/.test(value)) {
    report(file, `${trace} has repeated spaces`)
  }

  for (const pattern of duplicatedEndingPatterns) {
    if (pattern.test(value)) {
      report(file, `${trace} has duplicated polite ending`)
    }
    pattern.lastIndex = 0
  }
}

function assertSingleCorrectOption(file, trace, options) {
  const correctCount = options.filter((option) => option.isCorrect).length
  if (correctCount !== 1) {
    report(file, `${trace} must have exactly one correct option`)
  }
}

if (!fs.existsSync(manifestPath)) {
  report('content', 'manifest.json is missing')
} else {
  const manifest = readJson(manifestPath)
  const allLessons = []
  const allUnits = []
  const lessonIds = new Set()
  const unitIds = new Set()
  const reviewIds = new Set()

  scanStrings(manifest, (value, trace) => checkStringQuality('content/manifest.json', value, trace))

  for (const course of manifest.courses ?? []) {
    const relativeFile = typeof course.file === 'string' ? course.file.replace(/^\/content\//, '') : ''
    const courseFilePath = path.join(contentDir, relativeFile)

    if (!relativeFile || !fs.existsSync(courseFilePath)) {
      report('content/manifest.json', `missing course file for ${course.id}`)
      continue
    }

    const payload = readJson(courseFilePath)
    const fileLabel = path.relative(root, courseFilePath)

    scanStrings(payload, (value, trace) => checkStringQuality(fileLabel, value, trace))

    if (payload.course?.id !== course.id) {
      report(fileLabel, `course id does not match manifest: expected ${course.id}`)
    }

    if ((payload.lessons?.length ?? 0) !== course.lessonCount) {
      report(fileLabel, `lessonCount mismatch: manifest=${course.lessonCount}, file=${payload.lessons?.length ?? 0}`)
    }

    for (const unit of payload.units ?? []) {
      allUnits.push(unit)

      if (unitIds.has(unit.id)) {
        report(fileLabel, `duplicate unit id: ${unit.id}`)
      }
      unitIds.add(unit.id)

      if (unit.courseId !== course.id) {
        report(fileLabel, `unit ${unit.id} has mismatched courseId`)
      }
    }

    const fileLessonIds = new Set((payload.lessons ?? []).map((lesson) => lesson.id))

    for (const lesson of payload.lessons ?? []) {
      allLessons.push(lesson)

      if (lessonIds.has(lesson.id)) {
        report(fileLabel, `duplicate lesson id: ${lesson.id}`)
      }
      lessonIds.add(lesson.id)

      if (lesson.courseId !== course.id) {
        report(fileLabel, `lesson ${lesson.id} has mismatched courseId`)
      }

      if (!payload.units.some((unit) => unit.id === lesson.unitId)) {
        report(fileLabel, `lesson ${lesson.id} references missing unit ${lesson.unitId}`)
      }

      for (const step of lesson.steps ?? []) {
        if (step.type === 'choice') {
          assertSingleCorrectOption(fileLabel, `lesson ${lesson.id} step ${step.id}`, step.options ?? [])
        }
      }

      for (const item of lesson.reviewItems ?? []) {
        if (reviewIds.has(item.id)) {
          report(fileLabel, `duplicate review item id: ${item.id}`)
        }
        reviewIds.add(item.id)

        if (item.lessonId !== lesson.id) {
          report(fileLabel, `review item ${item.id} has mismatched lessonId`)
        }

        if (item.type === 'choice') {
          assertSingleCorrectOption(fileLabel, `review ${item.id}`, item.options ?? [])
        }
      }
    }

    for (const unit of payload.units ?? []) {
      for (const lessonId of unit.lessonIds ?? []) {
        if (!fileLessonIds.has(lessonId)) {
          report(fileLabel, `unit ${unit.id} references missing lesson ${lessonId}`)
        }
      }
    }
  }

  if (manifest.lessonCount !== allLessons.length) {
    report('content/manifest.json', `lessonCount mismatch: manifest=${manifest.lessonCount}, actual=${allLessons.length}`)
  }

  if (manifest.unitCount !== allUnits.length) {
    report('content/manifest.json', `unitCount mismatch: manifest=${manifest.unitCount}, actual=${allUnits.length}`)
  }
}

if (fs.existsSync(audioCatalogPath)) {
  const audioCatalogSource = fs.readFileSync(audioCatalogPath, 'utf8')
  const lessonIds = [...audioCatalogSource.matchAll(/'starter-[^']+'/g)].map((match) => match[0].slice(1, -1))

  for (const lessonId of lessonIds) {
    if (!fs.existsSync(path.join(starterAudioDir, `${lessonId}.mp3`))) {
      report('public/audio/starter', `missing recorded starter audio: ${lessonId}.mp3`)
    }
  }
}

if (issues.length) {
  console.error('Content QA check failed:')
  issues.forEach((issue) => console.error(`- ${issue}`))
  process.exit(1)
}

console.log('Content QA check passed.')
