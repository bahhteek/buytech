<?php

function telegram_configured()
{
    return env('TELEGRAM_BOT_TOKEN') !== '' && env('TELEGRAM_CHAT_ID') !== '';
}

function send_lead_telegram($lead)
{
    $token = env('TELEGRAM_BOT_TOKEN');
    $chat = env('TELEGRAM_CHAT_ID');
    if ($token === '' || $chat === '') {
        return array('sent' => false, 'reason' => 'not_configured');
    }

    $page = isset($lead['page']) ? trim((string) $lead['page']) : '';
    $lines = array(
        'Новая заявка BuyTech',
        'Имя: ' . $lead['name'],
        'Телефон: ' . $lead['phone'],
        'Email: ' . (isset($lead['email']) && $lead['email'] !== '' ? $lead['email'] : '—'),
        'Запрос: ' . (isset($lead['need']) && $lead['need'] !== '' ? $lead['need'] : '—'),
    );
    if ($page !== '') {
        $lines[] = 'Страница: ' . site_url() . $page;
    }
    if (!empty($lead['machineId'])) {
        $lines[] = 'Техника: ' . $lead['machineId'];
    }
    $place = trim((isset($lead['city']) ? $lead['city'] : '') . (isset($lead['country']) && $lead['country'] !== '' ? ', ' . $lead['country'] : ''));
    $place = trim($place, ', ');
    if ($place !== '') {
        $lines[] = 'Откуда: ' . $place;
    }

    $payload = json_encode(array(
        'chat_id' => $chat,
        'text' => implode("\n", $lines),
        'disable_web_page_preview' => true,
    ));
    $url = 'https://api.telegram.org/bot' . $token . '/sendMessage';
    $context = stream_context_create(array(
        'http' => array(
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\n",
            'content' => $payload,
            'timeout' => 8,
            'ignore_errors' => true,
        ),
    ));
    $raw = @file_get_contents($url, false, $context);
    $data = $raw ? json_decode($raw, true) : null;
    if (!is_array($data) || empty($data['ok'])) {
        return array('sent' => false, 'reason' => 'send_failed');
    }
    return array('sent' => true);
}
