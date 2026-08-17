import { brands, categories, machines } from './data'
import './App.css'

function App() {
  return (
    <div className="page">
      <header className="header">
        <a className="logo" href="#top">
          Buy<span>Tech</span>
        </a>
        <nav className="nav" aria-label="Основная навигация">
          <a href="#catalog">Каталог</a>
          <a href="#categories">Категории</a>
          <a href="#process">Поставка</a>
          <a href="#contact">Контакты</a>
        </nav>
        <a className="header-cta" href="#contact">
          Заявка
        </a>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="brand">
              Buy<span>Tech</span>
            </p>
            <h1>Новая спецтехника из Китая — в Казахстан</h1>
            <p className="hero-lead">
              Прямые поставки HOWO, Hengte, SOVOL, Shantui и SHANMON. Новые машины
              с полным пакетом документов и доставкой на объект.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#catalog">
                Смотреть технику
              </a>
              <a className="btn btn-ghost" href="#contact">
                Запросить цену
              </a>
            </div>
          </div>
          <div className="hero-visual">
            <img
              src="/images/excavator.jpg"
              alt="Жёлтый экскаватор — новая спецтехника"
            />
          </div>
        </section>

        <section className="brands" aria-label="Марки">
          <div className="brands-inner">
            <p>Работаем с заводами Китая</p>
            <ul>
              {brands.map((brand) => (
                <li key={brand}>{brand}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section categories" id="categories">
          <div className="section-head">
            <h2>Категории техники</h2>
            <p>
              Самосвалы, экскаваторы, бульдозеры и погрузчики под задачу объекта —
              подберём марку и комплектацию.
            </p>
          </div>
          <div className="category-grid">
            {categories.map((category) => (
              <a key={category.id} className="category" href="#catalog">
                <img src={category.image} alt={category.title} />
                <div className="category-meta">
                  <h3>{category.title}</h3>
                  <span>{category.hint}</span>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="section catalog" id="catalog">
          <div className="section-head">
            <h2>В наличии и под заказ</h2>
            <p>
              Новая техника с заводов Китая. Цены ориентировочные — точный расчёт
              и сроки поставки в Казахстан пришлём под вашу заявку.
            </p>
          </div>
          <div className="machine-grid">
            {machines.map((machine) => (
              <article key={machine.id} className="machine">
                <div className="machine-photo">
                  <img src={machine.image} alt={machine.name} />
                  <span className="machine-badge">{machine.condition}</span>
                </div>
                <div className="machine-body">
                  <div className="machine-top">
                    <span className="machine-tag">{machine.brand}</span>
                    <span className="machine-type">{machine.category}</span>
                  </div>
                  <h3>{machine.name}</h3>
                  <dl className="machine-specs">
                    <div>
                      <dt>Год</dt>
                      <dd>{machine.year}</dd>
                    </div>
                    <div>
                      <dt>Статус</dt>
                      <dd>{machine.condition}</dd>
                    </div>
                  </dl>
                  <div className="machine-foot">
                    <strong>{machine.price}</strong>
                    <a href="#contact">Запрос</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section process" id="process">
          <div className="section-head">
            <h2>Как идёт поставка</h2>
            <p>
              От заявки до техники в Казахстане — прозрачный маршрут через Китай
              с документами на каждом этапе.
            </p>
          </div>
          <ol className="steps">
            <li>
              <span>01</span>
              <h3>Запрос</h3>
              <p>Уточняем модель, комплектацию, сроки и бюджет.</p>
            </li>
            <li>
              <span>02</span>
              <h3>Подбор на заводе</h3>
              <p>Согласуем марку — HOWO, Hengte, SOVOL, Shantui или SHANMON.</p>
            </li>
            <li>
              <span>03</span>
              <h3>Документы</h3>
              <p>Контракт, оплата и полный пакет на ввоз новой техники.</p>
            </li>
            <li>
              <span>04</span>
              <h3>Доставка в РК</h3>
              <p>Привозим в Казахстан и передаём на ваш объект.</p>
            </li>
          </ol>
        </section>

        <section className="section contact" id="contact">
          <div className="contact-panel">
            <div className="contact-copy">
              <h2>Нужна техника из Китая?</h2>
              <p>
                Оставьте контакты — подберём марку и модель, посчитаем поставку
                в Казахстан и пришлём варианты в течение дня.
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
                <input
                  type="text"
                  name="need"
                  placeholder="HOWO самосвал, доставка в Алматы"
                />
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
          Buy<span>Tech</span>
        </a>
        <p>Новая спецтехника из Китая в Казахстан — с документами и доставкой.</p>
        <div className="footer-links">
          <a href="tel:+77001234567">+7 (700) 123-45-67</a>
          <a href="mailto:hello@buytech.kz">hello@buytech.kz</a>
        </div>
      </footer>
    </div>
  )
}

export default App
