import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { leadMeta } from '../analytics'
import { api } from '../api/client'
import type { Machine } from '../types'

export function QuoteModal({ machine, onClose }: { machine: Machine; onClose: () => void }) {
  const location = useLocation()
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    need: `Прошу подготовить коммерческое предложение.\n\nТехника: ${machine.name}\nМарка: ${machine.brand}\nКатегория: ${machine.category}`,
  })
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (sending) return
    setError('')
    setSending(true)
    void api
      .createLead({
        ...form,
        ...leadMeta({ page: location.pathname, machineId: machine.id }),
      })
      .then(() => setSent(true))
      .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось отправить'))
      .finally(() => setSending(false))
  }

  return createPortal(
    <div className="quote-modal" role="dialog" aria-modal="true" aria-label="Запросить КП">
      <button type="button" className="quote-backdrop" aria-label="Закрыть" onClick={onClose} />
      <div className="quote-card">
        <button type="button" className="btn btn-dark quote-close" onClick={onClose}>
          Закрыть
        </button>
        <h2>Запросить КП</h2>
        {sent ? (
          <p>Ваша заявка по {machine.name} отправлена, наш менеджер свяжется с вами как можно скорее.</p>
        ) : (
          <>
        <p>Заявка уйдёт по {machine.name}. Текст можно поправить перед отправкой.</p>
          <form className="quote-form" onSubmit={onSubmit}>
            <label>
              Имя
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </label>
            <label>
              Телефон
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </label>
            <label>
              Сообщение
              <textarea
                value={form.need}
                onChange={(event) => setForm((prev) => ({ ...prev, need: event.target.value }))}
              />
            </label>
            {error ? <p className="admin-error">{error}</p> : null}
            <button className={`btn btn-primary${sending ? ' is-busy' : ''}`} type="submit" disabled={sending} aria-busy={sending}>
              {sending ? <span className="btn-spinner" aria-hidden="true" /> : null}
              {sending ? 'Отправляем…' : 'Отправить заявку'}
            </button>
          </form>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
