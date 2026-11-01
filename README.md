# BuyTech

Сайт продажи спецтехники + админка. Фронт — React, API и админка на хостинге — **PHP**. Node.js на сервере не нужен.

## Локально

Нужны Node.js (сборка сайта) и PHP 7.4+ (API).

```bash
yarn install
yarn dev
```

- Сайт: http://localhost:5173/
- Админка: http://localhost:5173/admin
- API: http://localhost:5174/api/public
- Логин админки задаётся в `php/config.php` / `.env` (`ADMIN_USER` / `ADMIN_PASSWORD`)

## На обычный PHP-хостинг (ps.kz / Plesk)

```bash
yarn install
yarn build
```

В `dist/` будет готовый сайт: `index.php`, `spa-template.html`, `sitemap.php`, `sitemap.xml`, `api/`, `data/`, `uploads/`, `.htaccess`. Файла `index.html` в корне быть не должно — иначе nginx отдаст одну заглушку на все страницы.

1. Залейте **содержимое `dist/`** в корень сайта (`httpdocs` / `public_html`).
2. **Удалите старый `index.html`** из корня, если он остался от прошлой заливки.
3. В уже существующем `api/config.php` на сервере поставьте тот же `ADMIN_PASSWORD`, что в новой сборке (файл при выкладке не затирается).
4. Права на запись: папки `data/` и `uploads/` (обычно `775`).
5. PHP 7.4+.
6. Если сайт на nginx (Plesk), вставьте директивы из `deploy/nginx-seo.conf` в «Additional nginx directives», иначе каталог снова уйдёт в заглушку.

Админка: `https://ваш-домен/admin`

Фронт ходит в API по пути `/api/index.php/...` — так надёжнее на nginx (Plesk), где `.htaccess` часто не срабатывает.

## Почта для заявок

Заявки сохраняются в админке и дублируются на `info@buytech.kz` через PHP `mail()` (пароль ящика не нужен и в git не кладётся).

В `api/config.php` на хостинге достаточно:

```php
'SITE_URL' => 'https://buytech.kz',
'LEADS_EMAIL' => 'info@buytech.kz',
'SMTP_FROM' => 'BuyTech <info@buytech.kz>',
```

`SMTP_HOST` / `SMTP_PASS` не задавайте, пока `mail()` работает. Если письма не доходят — пропишите SMTP **только на сервере**, не в репозитории.

## Sitemap и вебмастера

Карта сайта для поисковиков: **https://buytech.kz/sitemap.php** (и запасной https://buytech.kz/sitemap.txt).

На Plesk в «Обрабатывать статические файлы с помощью nginx» **удалите `xml` из списка расширений** и нажмите «Применить». Пока `xml` там есть, nginx не отдаёт файл Apache, и PHP отвечает «No input file specified». Интеллектуальную обработку можно не трогать.

Админка `/admin` и API `/api` закрыты от индексации.

## Возможности админки

- редактирование текстов (главная, о компании, каталог, контакты, FAQ, футер)
- категории, марки, техника
- у техники: любые характеристики, несколько фото, видео, похожая техника
- заявки + дублирование на email (`info@buytech.kz`)
