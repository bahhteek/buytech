import { useState } from 'react'
import { api } from '../api/client'
import { resolveImageUrl } from '../mediaUrl'

export function SingleMediaField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const [error, setError] = useState('')

  async function upload(file: File) {
    setError('')
    try {
      const { url } = await api.upload(file)
      onChange(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить файл')
    }
  }

  return (
    <div className="admin-media-field">
      <span className="admin-field-label">{label}</span>
      {value ? <img src={resolveImageUrl(value)} alt="" className="admin-banner-preview" /> : null}
      <label className="admin-file">
        Загрузить файл
        <input
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void upload(file)
            event.target.value = ''
          }}
        />
      </label>
      <input
        value={value}
        placeholder="Или ссылка на картинку, в том числе Google Drive"
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p className="admin-error">{error}</p> : null}
    </div>
  )
}

export function MediaListField({
  label,
  hint,
  items,
  onChange,
  accept,
  kind,
}: {
  label: string
  hint: string
  items: string[]
  onChange: (items: string[]) => void
  accept: string
  kind: 'image' | 'video'
}) {
  const [link, setLink] = useState('')
  const [error, setError] = useState('')

  async function upload(file: File) {
    setError('')
    try {
      const { url } = await api.upload(file)
      onChange([...items, url])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить файл')
    }
  }

  function addLink() {
    const url = link.trim()
    if (!url) return
    onChange([...items, url])
    setLink('')
  }

  return (
    <div className="admin-span-2 admin-media-block">
      <span className="admin-field-label">{label}</span>
      <p className="admin-field-hint">{hint}</p>
      <div className="admin-thumbs">
        {items.map((url, index) => (
          <div key={`${url}-${index}`} className={kind === 'video' ? 'admin-thumb-wrap is-wide' : 'admin-thumb-wrap'}>
            {kind === 'image' ? <img src={resolveImageUrl(url)} alt="" /> : <span>{url}</span>}
            <button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label="Убрать">
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="admin-inline">
        <label className="admin-file">
          Загрузить
          <input
            type="file"
            accept={accept}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void upload(file)
              event.target.value = ''
            }}
          />
        </label>
        <input
          value={link}
          placeholder="Или ссылка: сайт, YouTube, Google Drive"
          onChange={(event) => setLink(event.target.value)}
        />
        <button className="btn btn-dark" type="button" onClick={addLink}>
          Добавить ссылку
        </button>
      </div>
      {error ? <p className="admin-error">{error}</p> : null}
    </div>
  )
}
