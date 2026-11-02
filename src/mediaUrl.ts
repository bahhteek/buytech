const DRIVE_ID =
  /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=download&)?id=)([a-zA-Z0-9_-]{10,})|[\?&]id=([a-zA-Z0-9_-]{10,})/

export function driveFileId(url: string) {
  if (!url.includes('drive.google.com')) return ''
  const match = url.match(DRIVE_ID)
  return match?.[1] || match?.[2] || ''
}

export function resolveImageUrl(url: string) {
  const id = driveFileId(url)
  if (!id) return url
  return `https://lh3.googleusercontent.com/d/${id}`
}

export function videoEmbed(url: string): { kind: 'youtube' | 'drive' | 'file'; src: string } {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/)
  if (yt) return { kind: 'youtube', src: `https://www.youtube.com/embed/${yt[1]}` }
  const drive = driveFileId(url)
  if (drive) return { kind: 'drive', src: `https://drive.google.com/file/d/${drive}/preview` }
  return { kind: 'file', src: url }
}
