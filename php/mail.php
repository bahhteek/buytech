<?php

function smtp_read_line($fp)
{
    $line = fgets($fp, 2048);
    return $line === false ? '' : $line;
}

function smtp_cmd($fp, $cmd, $expect)
{
    fwrite($fp, $cmd . "\r\n");
    $response = '';
    while ($line = smtp_read_line($fp)) {
        $response .= $line;
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }
    $code = (int) substr($response, 0, 3);
    if ($code !== $expect) {
        throw new RuntimeException('SMTP error: ' . trim($response));
    }
    return $response;
}

function mail_from_header()
{
    return env('SMTP_FROM', 'BuyTech <info@buytech.kz>');
}

function mail_from_address()
{
    $from = mail_from_header();
    if (preg_match('/<([^>]+)>/', $from, $match)) {
        return $match[1];
    }
    return $from !== '' ? $from : 'info@buytech.kz';
}

function send_smtp($to, $subject, $body)
{
    $host = env('SMTP_HOST');
    $port = (int) env('SMTP_PORT', '587');
    $secure = env('SMTP_SECURE') === 'true';
    $user = env('SMTP_USER', 'info@buytech.kz');
    $pass = env('SMTP_PASS');
    $from = mail_from_header();
    $fromEmail = mail_from_address();
    $ehlo = parse_url(site_url(), PHP_URL_HOST);
    if (!$ehlo) {
        $ehlo = 'buytech.kz';
    }

    $remote = ($secure && $port === 465) ? 'ssl://' . $host . ':' . $port : 'tcp://' . $host . ':' . $port;
    $fp = @stream_socket_client($remote, $errno, $errstr, 20, STREAM_CLIENT_CONNECT);
    if (!$fp) {
        throw new RuntimeException('SMTP connect failed: ' . $errstr);
    }
    stream_set_timeout($fp, 20);
    smtp_read_line($fp);
    smtp_cmd($fp, 'EHLO ' . $ehlo, 250);

    if (!$secure && $port !== 465) {
        fwrite($fp, "STARTTLS\r\n");
        $tls = smtp_read_line($fp);
        if (strpos($tls, '220') === 0) {
            if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('SMTP STARTTLS failed');
            }
            smtp_cmd($fp, 'EHLO ' . $ehlo, 250);
        }
    }

    if ($user !== '' && $pass !== '') {
        smtp_cmd($fp, 'AUTH LOGIN', 334);
        smtp_cmd($fp, base64_encode($user), 334);
        smtp_cmd($fp, base64_encode($pass), 235);
    }

    smtp_cmd($fp, 'MAIL FROM:<' . $fromEmail . '>', 250);
    smtp_cmd($fp, 'RCPT TO:<' . $to . '>', 250);
    smtp_cmd($fp, 'DATA', 354);
    $headers = 'From: ' . $from . "\r\n";
    $headers .= 'To: ' . $to . "\r\n";
    $headers .= 'Subject: =?UTF-8?B?' . base64_encode($subject) . '?=' . "\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $headers .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    fwrite($fp, $headers . str_replace("\n.", "\n..", $body) . "\r\n.\r\n");
    smtp_read_line($fp);
    fwrite($fp, "QUIT\r\n");
    fclose($fp);
}

function send_lead_email($lead)
{
    $to = env('LEADS_EMAIL', 'info@buytech.kz');
    if ($to === '') {
        $to = 'info@buytech.kz';
    }

    $subject = 'Заявка BuyTech: ' . $lead['name'];
    $text = implode("\n", array(
        'Имя: ' . $lead['name'],
        'Телефон: ' . $lead['phone'],
        'Email: ' . (isset($lead['email']) && $lead['email'] !== '' ? $lead['email'] : '—'),
        'Техника: ' . (isset($lead['need']) && $lead['need'] !== '' ? $lead['need'] : '—'),
        'Дата: ' . $lead['createdAt'],
    ));

    $host = env('SMTP_HOST');
    if ($host !== '') {
        send_smtp($to, $subject, $text);
        return array('sent' => true);
    }

    $from = mail_from_header();
    $fromEmail = mail_from_address();
    $reply = isset($lead['email']) && $lead['email'] !== '' ? $lead['email'] : $fromEmail;
    $headers = array(
        'From: ' . $from,
        'Reply-To: ' . $reply,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'X-Mailer: BuyTech',
    );
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $headerLine = implode("\r\n", $headers);
    $ok = @mail($to, $encodedSubject, $text, $headerLine, '-f' . $fromEmail);
    if (!$ok) {
        $ok = @mail($to, $encodedSubject, $text, $headerLine);
    }
    return $ok ? array('sent' => true) : array('sent' => false, 'reason' => 'send_failed');
}
