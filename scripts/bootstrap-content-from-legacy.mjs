import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const root = path.resolve(process.cwd())
const buildDir = path.join(root, '.content-build')
const contentDir = path.join(root, 'content')
const courseDir = path.join(contentDir, 'courses')
const require = createRequire(import.meta.url)

function ensureCleanDirectory(directory) {
  fs.rmSync(directory, { recursive: true, force: true })
  fs.mkdirSync(directory, { recursive: true })
}

ensureCleanDirectory(buildDir)

execFileSync(process.execPath, [path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js'), '-p', 'tsconfig.content-export.json'], {
  cwd: root,
  stdio: 'inherit',
})

fs.writeFileSync(path.join(buildDir, 'package.json'), `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`)

const curriculumModule = require(path.join(buildDir, 'data', 'curriculum.js'))
const { courseCatalog, curriculum, lessonOrder } = curriculumModule

ensureCleanDirectory(courseDir)

const manifestCourses = courseCatalog.map((course) => ({
  ...course,
  file: `/content/courses/${course.id}.json`,
}))

const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  lessonCount: lessonOrder.length,
  unitCount: curriculum.length,
  courses: manifestCourses,
}

fs.writeFileSync(path.join(contentDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

for (const course of courseCatalog) {
  const payload = {
    course,
    units: curriculum.filter((unit) => unit.courseId === course.id),
    lessons: lessonOrder.filter((lesson) => lesson.courseId === course.id),
  }

  fs.writeFileSync(path.join(courseDir, `${course.id}.json`), `${JSON.stringify(payload, null, 2)}\n`)
}

fs.rmSync(buildDir, { recursive: true, force: true })
console.log(`Bootstrapped content into ${contentDir}`)
