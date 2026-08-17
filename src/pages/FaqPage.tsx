import { Link } from 'react-router-dom'
import { Footer, Header } from '../components/Layout'
import { useSite } from '../context/SiteContext'
import './FaqPage.css'

export function FaqPage() {
  const { content } = useSite()
  const faqs = content.faq || []

  return (
    <div className="page faq-page">
      <Header />

      <main className="faq-main">
        <div className="faq-top">
          <p className="faq-kicker">FAQ</p>
          <h1>Частые вопросы</h1>
          <p>
            Коротко о поставках спецтехники из Китая в Казахстан: сроки, документы,
            цены и гарантия.
          </p>
        </div>

        <div className="faq-list">
          {faqs.map((item) => (
            <details key={item.id} className="faq-item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>

        <div className="faq-cta">
          <div>
            <h2>Не нашли ответ?</h2>
            <p>Напишите нам — подберём технику и посчитаем поставку под ваш объект.</p>
          </div>
          <Link className="btn btn-primary" to="/contacts">
            Задать вопрос
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
