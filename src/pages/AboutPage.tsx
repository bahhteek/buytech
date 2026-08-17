import { Link } from 'react-router-dom'
import { Footer, Header } from '../components/Layout'
import { useSite } from '../context/SiteContext'
import { normalizeAbout } from '../types'
import './AboutPage.css'

export function AboutPage() {
  const { content } = useSite()
  const about = normalizeAbout(content.about)

  return (
    <div className="page about-page">
      <Header />

      <main className="about-main">
        <div className="about-top">
          <p className="about-kicker">О компании</p>
          <h1>{about.title}</h1>
          <p>{about.lead}</p>
        </div>

        <div className="about-roles">
          {about.roles.map((role) => (
            <article className="about-role" key={role.id}>
              <p className="about-role-kicker">{role.kicker}</p>
              <h2>{role.title}</h2>
              <p>{role.text}</p>
              <ul>
                {role.points.filter(Boolean).map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <section className="about-facts" aria-label="Факты о поставщике">
          {about.facts.map((fact) => (
            <article key={fact.id}>
              <strong>{fact.value}</strong>
              <span>{fact.label}</span>
            </article>
          ))}
        </section>

        <section className="about-process">
          <div className="about-process-head">
            <h2>{about.stepsTitle}</h2>
            <p>{about.stepsLead}</p>
          </div>
          <ol className="about-steps">
            {about.steps.map((step) => (
              <li key={step.id}>
                <span>{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="about-cta">
          <div>
            <h2>{about.ctaTitle}</h2>
            <p>{about.ctaLead}</p>
          </div>
          <Link className="btn btn-primary" to="/contacts">
            {about.ctaButton}
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  )
}
