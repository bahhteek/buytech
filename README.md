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
- Пароль по умолчанию: `admin` / `buytech-admin`

## На обычный PHP-хостинг (ps.kz / Plesk)

```bash
yarn install
yarn build
```

В `dist/` будет готовый сайт: HTML, `api/`, `data/`, `uploads/`, `.htaccess`.

1. Залейте **содержимое `dist/`** в корень сайта (`httpdocs` / `public_html`).
2. Откройте `api/config.php` и смените `ADMIN_PASSWORD`.
3. Права на запись: папки `data/` и `uploads/` (обычно `775`).
4. PHP 7.4+.

Админка: `https://ваш-домен/admin`

Фронт ходит в API по пути `/api/index.php/...` — так надёжнее на nginx (Plesk), где `.htaccess` часто не срабатывает.

## Почта для заявок

Скопируйте `.env.example` в `.env` локально или заполните SMTP в `api/config.php` на хосте. Без SMTP заявки всё равно сохраняются во вкладке «Заявки».

## Возможности админки

- редактирование текстов (главная, о компании, каталог, контакты, FAQ, футер)
- категории, марки, техника
- у техники: любые характеристики, несколько фото, видео, похожая техника
- заявки + дублирование на email (если настроен SMTP)
