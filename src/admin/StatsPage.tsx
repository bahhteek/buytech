import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { AnalyticsRange, AnalyticsReport } from '../types'
import { useSite } from '../context/SiteContext'

const RANGES: { id: AnalyticsRange; label: string }[] = [
  { id: 'day', label: 'День' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'year', label: 'Год' },
  { id: 'all', label: 'Всё время' },
]

const RANGE_NAME: Record<AnalyticsRange, string> = {
  day: 'этот день',
  week: 'эту неделю',
  month: 'этот месяц',
  year: 'этот год',
  all: 'всё время',
}

function confirmClear(scope: 'all' | 'period' | 'machine', range: AnalyticsRange, machine: boolean) {
  const text =
    scope === 'all'
      ? 'Очистить всю статистику сайта? Заявки в списке останутся, с графиков пропадут.'
      : scope === 'machine'
        ? 'Очистить всю статистику этой техники? Заявки в списке останутся.'
        : machine
          ? `Очистить статистику этой техники за ${RANGE_NAME[range]}? Заявки в списке останутся.`
          : `Очистить статистику за ${RANGE_NAME[range]}? Заявки в списке останутся.`
  return window.confirm(text)
}

const SOURCE_LABEL: Record<string, string> = {
  direct: 'Прямые заходы',
  search: 'Поиск',
  social: 'Соцсети',
  referral: 'Другие сайты',
}

const DEVICE_LABEL: Record<string, string> = {
  desktop: 'Компьютер',
  tablet: 'Планшет',
  mobile: 'Телефон',
}

function RangeTabs({ value, onChange }: { value: AnalyticsRange; onChange: (range: AnalyticsRange) => void }) {
  return (
    <div className="admin-tabs">
      {RANGES.map((item) => (
        <button key={item.id} type="button" className={value === item.id ? 'is-active' : undefined} onClick={() => onChange(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  )
}

export function StatsPage() {
  const { allMachines } = useSite()
  const [range, setRange] = useState<AnalyticsRange>('month')
  const [report, setReport] = useState<AnalyticsReport | null>(null)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    setError('')
    void api
      .getAnalytics(range)
      .then((data) => {
        if (!cancelled) setReport(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Не удалось загрузить статистику')
      })
    return () => {
      cancelled = true
    }
  }, [range, version])

  function onClear(scope: 'all' | 'period') {
    if (!confirmClear(scope, range, false)) return
    void api
      .clearAnalytics({ scope, range })
      .then(() => setVersion((value) => value + 1))
      .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось очистить статистику'))
  }

  const names = new Map(allMachines.map((machine) => [machine.id, machine.name]))

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <h1>Статистика</h1>
        <RangeTabs value={range} onChange={setRange} />
      </div>
      <p className="admin-muted">
        Один IP за выбранный период считается одним человеком. Обновление той же страницы в тот же день не добавляет просмотр.
        Пока вы вошли в админку, этот браузер в статистику не пишется. Город и страна определяются по IP, сам адрес не сохраняется.
      </p>
      <div className="admin-clear">
        <button type="button" onClick={() => onClear('period')}>Очистить период</button>
        <button type="button" onClick={() => onClear('all')}>Очистить всё</button>
      </div>
      {error ? <p className="admin-error">{error}</p> : null}
      {report ? (
        <>
          <div className="admin-stats">
            <article>
              <strong>{report.summary.views}</strong>
              <span>Просмотры</span>
            </article>
            <article>
              <strong>{report.summary.visitors}</strong>
              <span>Люди</span>
            </article>
            <article>
              <strong>{report.summary.leads}</strong>
              <span>Заявки</span>
            </article>
            <article>
              <strong>{report.summary.conversion}%</strong>
              <span>Заявки / просмотры</span>
            </article>
          </div>
          <section className="admin-content-block">
            <div className="admin-content-block-head">
              <h2>{range === 'day' ? 'Просмотры и заявки по часам' : 'Просмотры и заявки'}</h2>
            </div>
            <TrendChart series={report.series} />
          </section>
          <div className="admin-stats-split">
            <section className="admin-content-block">
              <h2>Откуда пришли</h2>
              <BarList
                rows={report.sources.map((row) => ({
                  label: SOURCE_LABEL[row.source] || row.source,
                  value: row.views,
                  note: `${row.leads} заявок`,
                }))}
              />
            </section>
            <section className="admin-content-block">
              <h2>Устройства</h2>
              <BarList
                rows={report.devices.map((row) => ({
                  label: DEVICE_LABEL[row.device] || row.device,
                  value: row.views,
                  note: '',
                }))}
              />
            </section>
          </div>
          <div className="admin-stats-split">
            <section className="admin-content-block">
              <h2>Города</h2>
              <StatsTable
                columns={['Город', 'Просмотры', 'Люди', 'Заявки']}
                rows={report.places.map((row) => [
                  row.label,
                  String(row.views),
                  String(row.visitors),
                  String(row.leads),
                ])}
                empty="Город появится, когда страницу откроют не из локальной сети."
              />
            </section>
            <section className="admin-content-block">
              <h2>Что искали</h2>
              <StatsTable
                columns={['Запрос', 'Раз']}
                rows={report.searches.map((row) => [row.query, String(row.count)])}
                empty="Поисковых запросов за этот период нет."
              />
            </section>
          </div>
          <section className="admin-content-block">
            <h2>Страницы</h2>
            <StatsTable
              columns={['Страница', 'Просмотры', 'Люди', 'Заявки', 'Конверсия']}
              rows={report.pages.map((row) => [
                row.title || row.path,
                String(row.views),
                String(row.visitors),
                String(row.leads),
                `${row.conversion}%`,
              ])}
              empty="Пока нет просмотров. Цифры появятся, когда кто-то откроет сайт."
            />
          </section>
          <section className="admin-content-block">
            <h2>Техника</h2>
            <StatsTable
              columns={['Позиция', 'Просмотры', 'Люди', 'Заявки', 'Конверсия']}
              rows={report.machines.map((row) => [
                names.get(row.id) || row.id,
                String(row.views),
                String(row.visitors),
                String(row.leads),
                `${row.conversion}%`,
              ])}
              empty="Карточки техники ещё не открывали."
            />
          </section>
          <section className="admin-content-block">
            <h2>Telegram</h2>
            <p>
              {report.telegram.configured
                ? 'Копия заявки уходит в Telegram.'
                : 'Чтобы дублировать заявки в Telegram, создайте бота у @BotFather, напишите ему сообщение и добавьте в .env TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID. Chat id виден в getUpdates.'}
            </p>
          </section>
        </>
      ) : !error ? (
        <p className="admin-muted">Собираем цифры…</p>
      ) : null}
    </div>
  )
}

export function MachineStats({ machineId }: { machineId: string }) {
  const [range, setRange] = useState<AnalyticsRange>('month')
  const [report, setReport] = useState<AnalyticsReport | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    void api.getAnalytics(range, machineId).then((data) => {
      if (!cancelled) setReport(data)
    }).catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [machineId, range, version])

  function onClear(scope: 'period' | 'machine') {
    if (!confirmClear(scope, range, true)) return
    void api.clearAnalytics({ scope, range, machineId }).then(() => setVersion((value) => value + 1)).catch(() => undefined)
  }

  if (!report) return null
  return (
    <section className="admin-content-block">
      <div className="admin-content-block-head">
        <h2>Статистика</h2>
        <RangeTabs value={range} onChange={setRange} />
      </div>
      <p>Просмотры этой карточки и заявки, отправленные с неё.</p>
      <div className="admin-clear">
        <button type="button" onClick={() => onClear('period')}>Очистить период</button>
        <button type="button" onClick={() => onClear('machine')}>Очистить всё</button>
      </div>
      <div className="admin-stats">
        <article>
          <strong>{report.summary.views}</strong>
          <span>Просмотры</span>
        </article>
        <article>
          <strong>{report.summary.visitors}</strong>
          <span>Люди</span>
        </article>
        <article>
          <strong>{report.summary.leads}</strong>
          <span>Заявки</span>
        </article>
        <article>
          <strong>{report.summary.conversion}%</strong>
          <span>Заявки / просмотры</span>
        </article>
      </div>
      <TrendChart series={report.series} />
      <h3>Откуда смотрели</h3>
      <StatsTable
        columns={['Город', 'Просмотры', 'Люди', 'Заявки']}
        rows={report.places.map((row) => [row.label, String(row.views), String(row.visitors), String(row.leads)])}
        empty="По этой карточке город ещё не определился."
      />
    </section>
  )
}

function TrendChart({ series }: { series: AnalyticsReport['series'] }) {
  const [active, setActive] = useState<number | null>(null)
  const width = 640
  const height = 200
  const pad = 12
  const max = Math.max(1, ...series.map((row) => Math.max(row.views, row.leads)))
  const step = series.length > 1 ? (width - pad * 2) / (series.length - 1) : 0
  const point = (index: number, value: number) => {
    const x = series.length === 1 ? width / 2 : pad + index * step
    const y = height - 16 - (value / max) * (height - 36)
    return { x, y }
  }
  const line = (key: 'views' | 'leads') =>
    series.map((row, index) => {
      const spot = point(index, row[key])
      return `${spot.x},${spot.y}`
    }).join(' ')
  const ticks = series.filter((_, index) => index % Math.ceil(series.length / 6) === 0 || index === series.length - 1)
  const current = active !== null ? series[active] : null
  const currentX = current && active !== null ? point(active, 0).x : 0

  return (
    <div className="admin-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="График просмотров и заявок">
        <polyline points={line('views')} fill="none" stroke="#0b0b0b" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <polyline points={line('leads')} fill="none" stroke="#ffd400" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {current && active !== null ? (
          <line x1={currentX} x2={currentX} y1={8} y2={height - 16} stroke="#d5d5ce" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ) : null}
        {series.map((row, index) => {
          const slot = series.length === 1 ? width : step
          const x = series.length === 1 ? 0 : pad + index * step - slot / 2
          return (
            <rect
              key={row.date}
              x={x}
              y={0}
              width={Math.max(slot, 1)}
              height={height}
              fill="transparent"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
            />
          )
        })}
      </svg>
      {current ? (
        <div className="admin-chart-tip" style={{ left: `${Math.min(88, Math.max(12, (currentX / width) * 100))}%` }}>
          <strong>{current.label}</strong>
          <span>Просмотры {current.views}</span>
          <span>Заявки {current.leads}</span>
        </div>
      ) : null}
      <div className="admin-chart-legend">
        <span><i /> Просмотры</span>
        <span><i className="is-lead" /> Заявки</span>
      </div>
      <div className="admin-chart-ticks">
        {ticks.map((row) => (
          <span key={row.date}>{row.label}</span>
        ))}
      </div>
    </div>
  )
}

function BarList({ rows }: { rows: { label: string; value: number; note: string }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value))
  if (!rows.length) return <p className="admin-muted">Пока пусто.</p>
  return (
    <ul className="admin-bars">
      {rows.map((row) => (
        <li key={row.label}>
          <div>
            <strong>{row.label}</strong>
            <span>{row.value}{row.note ? ` · ${row.note}` : ''}</span>
          </div>
          <i style={{ width: `${Math.max(6, (row.value / max) * 100)}%` }} />
        </li>
      ))}
    </ul>
  )
}

function StatsTable({ columns, rows, empty }: { columns: string[]; rows: string[][]; empty: string }) {
  if (!rows.length) return <p className="admin-muted">{empty}</p>
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join('|')}>
              {row.map((cell, index) => (
                <td key={`${cell}-${index}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
