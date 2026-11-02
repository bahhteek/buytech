const ALLOWED = new Set([
  'P',
  'H1',
  'H2',
  'H3',
  'H4',
  'STRONG',
  'EM',
  'B',
  'I',
  'U',
  'S',
  'UL',
  'OL',
  'LI',
  'A',
  'IMG',
  'BLOCKQUOTE',
  'BR',
  'HR',
  'FIGURE',
  'FIGCAPTION',
  'DIV',
  'SPAN',
  'TABLE',
  'THEAD',
  'TBODY',
  'TR',
  'TD',
  'TH',
  'PRE',
  'CODE',
  'STYLE',
])

function safeStyle(value: string) {
  if (/expression\s*\(|javascript\s*:|@import/i.test(value)) return ''
  return value
}

function cleanNode(node: Node) {
  const children = [...node.childNodes]
  for (const child of children) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const element = child as HTMLElement
      if (!ALLOWED.has(element.tagName)) {
        element.replaceWith(...element.childNodes)
        continue
      }
      const attrs = [...element.attributes]
      for (const attr of attrs) {
        const name = attr.name.toLowerCase()
        if (name.startsWith('on')) {
          element.removeAttribute(attr.name)
          continue
        }
        const keep =
          name === 'style' ||
          name === 'class' ||
          (element.tagName === 'A' && (name === 'href' || name === 'target' || name === 'rel')) ||
          (element.tagName === 'IMG' && (name === 'src' || name === 'alt' || name === 'width' || name === 'height')) ||
          ((element.tagName === 'TD' || element.tagName === 'TH') && (name === 'colspan' || name === 'rowspan'))
        if (!keep) element.removeAttribute(attr.name)
        if (name === 'style') {
          const cleaned = safeStyle(attr.value)
          if (cleaned) element.setAttribute('style', cleaned)
          else element.removeAttribute('style')
        }
      }
      if (element.tagName === 'A') {
        const href = element.getAttribute('href') || ''
        if (!/^https?:\/\//i.test(href) && !href.startsWith('/') && !href.startsWith('#')) {
          element.removeAttribute('href')
        } else {
          element.setAttribute('rel', 'noopener noreferrer')
          element.setAttribute('target', '_blank')
        }
      }
      if (element.tagName === 'IMG') {
        const src = element.getAttribute('src') || ''
        if (!/^https?:\/\//i.test(src) && !src.startsWith('/')) element.remove()
      }
      cleanNode(element)
    } else if (child.nodeType !== Node.TEXT_NODE) {
      child.remove()
    }
  }
}

export function sanitizeArticle(html: string) {
  if (!html.trim() || typeof DOMParser === 'undefined') return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const styles = [...doc.head.querySelectorAll('style')]
    .map((node) => {
      const text = node.textContent || ''
      if (/expression\s*\(|javascript\s*:|@import/i.test(text)) return ''
      return `<style>${text}</style>`
    })
    .join('')
  cleanNode(doc.body)
  return `${styles}${doc.body.innerHTML}`
}
