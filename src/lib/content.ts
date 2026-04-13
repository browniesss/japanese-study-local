import type { ContentBundle, ContentManifest, CourseContentFile, Lesson } from '../types'

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`콘텐츠를 불러오지 못했습니다: ${url}`)
  }

  return (await response.json()) as T
}

export async function loadContentBundle(): Promise<ContentBundle> {
  const manifest = await fetchJson<ContentManifest>('/content/manifest.json')
  const courseFiles = await Promise.all(manifest.courses.map((course) => fetchJson<CourseContentFile>(course.file)))
  const courseCatalog = manifest.courses.map((course) => ({
    id: course.id,
    label: course.label,
    title: course.title,
    summary: course.summary,
    audience: course.audience,
    lessonCount: course.lessonCount,
  }))
  const curriculum = courseFiles.flatMap((course) => course.units)
  const lessonOrder = courseFiles.flatMap((course) => course.lessons)
  const lessonRecord = Object.fromEntries(lessonOrder.map((lesson) => [lesson.id, lesson])) as Record<string, Lesson>
  const reviewPool = lessonOrder.flatMap((lesson) => lesson.reviewItems)

  return {
    manifest,
    courseCatalog,
    curriculum,
    lessonOrder,
    lessonRecord,
    reviewPool,
  }
}
