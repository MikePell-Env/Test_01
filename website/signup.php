<?php
declare(strict_types=1);

/* Envisioner, Inc. — signup handler.
   Receives the hero form and mails it on. Runs on cPanel PHP; no dependencies. */

const RECIPIENT = 'hello@envisionerinc.com';
/* Must be an address on this domain, or the host's SPF record will not vouch
   for the message and it lands in spam. The signer's address goes in Reply-To. */
const SENDER = 'no-reply@envisionerinc.com';

function wants_json(): bool
{
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    $xhr = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    return strtolower($xhr) === "fetch" || strpos($accept, "application/json") !== false;
}

function respond(int $status, bool $ok, string $message)
{
    http_response_code($status);

    if (wants_json()) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_SLASHES);
        exit;
    }

    /* No-JS fallback: a plain page in the site's colours. */
    $safe = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
    header('Content-Type: text/html; charset=utf-8');
    echo <<<HTML
    <!doctype html>
    <html lang="en"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Envisioner, Inc.</title>
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#05070a;color:#e9eff6;
        font:300 16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;text-align:center;padding:2rem}
      p{margin:0 0 1.75rem;max-width:34ch}
      a{color:#5ce1d4;text-decoration:none;font-size:12.5px;letter-spacing:.22em;text-transform:uppercase;
        border:1px solid rgba(92,225,212,.4);border-radius:6px;padding:.8rem 1.9rem}
    </style></head>
    <body><div><p>{$safe}</p><a href="/">Back to Envisioner</a></div></body></html>
    HTML;
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'Method not allowed.');
}

/* Bots fill every field they find; people never see this one. */
if (trim((string)($_POST['company'] ?? '')) !== '') {
    respond(200, true, 'You are on the list.');
}

$name = trim((string)($_POST['name'] ?? ''));
$email = trim((string)($_POST['email'] ?? ''));

if ($email === '') {
    respond(422, false, 'Enter your email address.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) {
    respond(422, false, 'That email address does not look right.');
}
/* A newline in a header field lets a sender inject extra headers. Refuse outright. */
if (preg_match('/[\r\n]/', $name . $email)) {
    respond(422, false, 'That submission could not be processed.');
}

$name = function_exists("mb_substr") ? mb_substr($name, 0, 100) : substr($name, 0, 100);
$displayName = $name !== '' ? $name : 'Someone';

$subject = 'Envisioner signup: ' . $email;
$body = "New signup from envisionerinc.com\n\n"
    . "Name:  " . ($name !== '' ? $name : '(not given)') . "\n"
    . "Email: {$email}\n"
    . "Time:  " . gmdate('Y-m-d H:i:s') . " UTC\n"
    . "IP:    " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . "\n";

$headers = [
    'From: Envisioner Signups <' . SENDER . '>',
    'Reply-To: ' . $displayName . ' <' . $email . '>',
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    'X-Mailer: envisionerinc.com',
];

$sent = @mail(RECIPIENT, $subject, $body, implode("\r\n", $headers), '-f' . SENDER);

if (!$sent) {
    error_log('envisioner: mail() failed for ' . $email);
    respond(500, false, 'Something went wrong on our end. Try again shortly.');
}

respond(200, true, 'You are on the list.');
