import { categories, machines } from './data'
import './App.css'

function App() {
  return (
    <div className="page">
      <header className="header">
        <a className="logo" href="#top">
          BuyTech
        </a>
        <nav className="nav" aria-label="Основная навигация">
          <a href="#catalog">Каталог</a>
          <a href="#categories">Категории</a>
          <a href="#process">Как работаем</a>
          <a href="#contact">Контакты</a>
        </nav>
        <a className="header-cta" href="#contact">
          Заявка
        </a>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-media" aria-hidden="true">
            <img
              src="https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1800&q=80"
              alt=""
            />
          </div>
          <div className="hero-veil" aria-hidden="true" />
          <div className="hero-content">
            <p className="brand">BuyTech</p>
            <h1>Спецтехника, которая выходит на смену сразу</h1>
            <p className="hero-lead">
              Подбираем экскаваторы, погрузчики и краны под задачу — с проверкой,
              документами и доставкой.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#catalog">
                Смотреть каталог
              </a>
              <a className="btn btn-ghost" href="#contact">
                Получить подбор
              </a>
            </div>
          </div>
        </section>

        <section className="section categories" id="categories">
          <div className="section-head">
            <h2>Категории техники</h2>
            <p>Выберите направление — покажем актуальный парк и варианты под бюджет.</p>
          </div>
          <div className="category-grid">
            {categories.map((category) => (
              <a key={category.id} className="category" href="#catalog">
                <img src={category.image} alt="" />
                <div className="category-meta">
                  <h3>{category.title}</h3>
                  <span>{category.count}</span>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="section catalog" id="catalog">
          <div className="section-head">
            <h2>В наличии сейчас</h2>
            <p>Проверенные машины с прозрачной историей наработки и готовностью к отгрузке.</p>
          </div>
          <div className="machine-list">
            {machines.map((machine) => (
              <article key={machine.id} className="machine">
                <div className="machine-photo">
                  <img src={machine.image} alt={machine.name} />
                </div>
                <div className="machine-body">
                  <span className="machine-tag">{machine.category}</span>
                  <h3>{machine.name}</h3>
                  <dl className="machine-specs">
                    <div>
                      <dt>Год</dt>
                      <dd>{machine.year}</dd>
                    </div>
                    <div>
                      <dt>Наработка</dt>
                      <dd>{machine.hours}</dd>
                    </div>
                  </dl>
                  <div className="machine-foot">
                    <strong>{machine.price}</strong>
                    <a href="#contact">Уточнить</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section process" id="process">
          <div className="section-head">
            <h2>Как проходит сделка</h2>
            <p>Четыре шага от запроса до техники на объекте — без сюрпризов по пути.</p>
          </div>
          <ol className="steps">
            <li>
              <span>01</span>
              <h3>Задача и бюджет</h3>
              <p>Фиксируем тип работ, сроки и рамки по цене.</p>
            </li>
            <li>
              <span>02</span>
              <h3>Подбор и проверка</h3>
              <p>Сверяем состояние, документы и историю эксплуатации.</p>
            </li>
            <li>
              <span>03</span>
              <h3>Сделка</h3>
              <p>Оформляем договор, оплату и передачу ответственности.</p>
            </li>
            <li>
              <span>04</span>
              <h3>Доставка</h3>
              <p>Организуем логистику и ввод в работу на объекте.</p>
            </li>
          </ol>
        </section>

        <section className="section contact" id="contact">
          <div className="contact-panel">
            <div className="contact-copy">
              <h2>Нужна техника под конкретный объект?</h2>
              <p>
                Оставьте контакты — менеджер уточнит задачу и пришлёт 2–3 варианта
                с ценой и сроками в течение дня.
              </p>
            </div>
            <form
              className="contact-form"
              onSubmit={(event) => {
                event.preventDefault()
              }}
            >
              <label>
                Имя
                <input type="text" name="name" placeholder="Алексей" required />
              </label>
              <label>
                Телефон
                <input type="tel" name="phone" placeholder="+7 (___) ___-__-__" required />
              </label>
              <label>
                Какая техника нужна
                <input type="text" name="need" placeholder="Экскаватор 20 т, доставка в Астану" />
              </label>
              <button className="btn btn-primary" type="submit">
                Отправить заявку
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="footer">
        <a className="logo" href="#top">
          BuyTech
        </a>
        <p>Спецтехника с проверкой, документами и доставкой по Казахстану.</p>
        <div className="footer-links">
          <a href="tel:+77001234567">+7 (700) 123-45-67</a>
          <a href="mailto:hello@buytech.kz">hello@buytech.kz</a>
        </div>
      </footer>
    </div>
  )
}

export default App
