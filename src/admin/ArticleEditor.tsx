import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { sanitizeArticle } from '../articleHtml'

export function ArticleEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'visual' | 'code'>('visual')
  const [error, setError] = useState('')

  useEffect(() => {
    if (mode !== 'visual' || !ref.current) return
    if (document.activeElement === ref.current) return
    if (ref.current.innerHTML !== value) ref.current.innerHTML = value
  }, [value, mode])

  function sync() {
    onChange(sanitizeArticle(ref.current?.innerHTML || ''))
  }

  function apply(command: string, arg?: string) {
    ref.current?.focus()
    const worked = document.execCommand(command, false, arg)
    if (!worked && command === 'formatBlock' && arg) {
      document.execCommand(command, false, `<${arg}>`)
    }
    sync()
  }

  function addLink() {
    const href = window.prompt('Ссылка')
    if (!href) return
    apply('createLink', href)
  }

  function addImageUrl() {
    const src = window.prompt('Ссылка на картинку')
    if (!src) return
    apply('insertHTML', `<figure><img src="${src}" alt="" /></figure>`)
  }

  async function uploadImage(file: File) {
    setError('')
    try {
      const { url } = await api.upload(file)
      apply('insertHTML', `<figure><img src="${url}" alt="" /></figure>`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить картинку')
    }
  }

  function switchMode(next: 'visual' | 'code') {
    if (next === 'code' && ref.current) onChange(ref.current.innerHTML)
    setMode(next)
  }

  return (
    <div className="article-editor">
      <div className="article-toolbar">
        <button type="button" className={mode === 'visual' ? 'is-active' : undefined} onClick={() => switchMode('visual')}>
          Визуально
        </button>
        <button type="button" className={mode === 'code' ? 'is-active' : undefined} onClick={() => switchMode('code')}>
          HTML
        </button>
        {mode === 'visual' ? (
          <>
            <button type="button" onClick={() => apply('formatBlock', 'P')}>Текст</button>
            <button type="button" onClick={() => apply('formatBlock', 'H2')}>Заголовок</button>
            <button type="button" onClick={() => apply('formatBlock', 'H3')}>Подзаголовок</button>
            <button type="button" onClick={() => apply('bold')}><b>Ж</b></button>
            <button type="button" onClick={() => apply('italic')}><i>К</i></button>
            <button type="button" onClick={() => apply('underline')}><u>Ч</u></button>
            <button type="button" onClick={() => apply('insertUnorderedList')}>Список</button>
            <button type="button" onClick={() => apply('insertOrderedList')}>Нумерация</button>
            <button type="button" onClick={() => apply('formatBlock', 'BLOCKQUOTE')}>Цитата</button>
            <button type="button" onClick={() => apply('justifyLeft')}>Слева</button>
            <button type="button" onClick={() => apply('justifyCenter')}>Центр</button>
            <button type="button" onClick={addLink}>Ссылка</button>
            <button type="button" onClick={() => apply('insertHorizontalRule')}>Линия</button>
            <button type="button" onClick={addImageUrl}>Картинка по ссылке</button>
            <label>
              Загрузить картинку
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void uploadImage(file)
                  event.target.value = ''
                }}
              />
            </label>
          </>
        ) : null}
      </div>
      {mode === 'visual' ? (
        <div
          ref={ref}
          className="article-canvas"
          contentEditable
          role="textbox"
          aria-label="Текст статьи"
          onInput={sync}
          suppressContentEditableWarning
        />
      ) : (
        <textarea
          className="article-code"
          value={value}
          spellCheck={false}
          aria-label="HTML статьи"
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error ? <p className="admin-error">{error}</p> : null}
    </div>
  )
}
