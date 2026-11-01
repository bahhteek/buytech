<?php

return array(
    'ADMIN_USER' => 'admin',
    'ADMIN_PASSWORD' => 'bax123bax32123',
    'SITE_URL' => 'https://buytech.kz',
    'LEADS_EMAIL' => 'info@buytech.kz',
    'SMTP_FROM' => 'BuyTech <info@buytech.kz>',
    // Пароль почты не храните в git. Если mail() на хостинге не сработает,
    // пропишите SMTP_HOST / SMTP_USER / SMTP_PASS только в api/config.php на сервере.
    'SMTP_HOST' => '',
    'SMTP_PORT' => '587',
    'SMTP_SECURE' => 'false',
    'SMTP_USER' => 'info@buytech.kz',
    'SMTP_PASS' => '',
);
