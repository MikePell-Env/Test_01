/* Local preview server for the Envisioner site.
 *
 * DEV ONLY — never deployed. Serves the sibling website/ repository, whose
 * contents are what ship. It stands in for signup.php,
 * which needs PHP and so cannot run here. The stub mirrors the PHP handler's
 * responses so the success and error states are visible locally; it proves
 * nothing about the PHP itself. Signups are printed to this console, not sent.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'website');
const PORT = 4321;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function handleSignup(req, res) {
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
    if (raw.length > 1e6) req.destroy();
  });
  req.on('end', () => {
    const fields = {};
    /* The browser sends multipart/form-data via FormData; pull the values out. */
    const boundary = (req.headers['content-type'] || '').split('boundary=')[1];
    if (boundary) {
      for (const part of raw.split('--' + boundary)) {
        const m = part.match(/name="([^"]+)"\r?\n\r?\n([\s\S]*?)\r?\n?$/);
        if (m) fields[m[1]] = m[2].trim();
      }
    } else {
      for (const [k, v] of new URLSearchParams(raw)) fields[k] = v;
    }

    const name = (fields.name || '').trim();
    const email = (fields.email || '').trim();

    if ((fields.company || '').trim() !== '') {
      return json(res, 200, { ok: true, message: 'You are on the list.' });
    }
    if (!email) {
      return json(res, 422, { ok: false, message: 'Enter your email address.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
      return json(res, 422, { ok: false, message: 'That email address does not look right.' });
    }

    console.log(`\n  signup -> hello@envisionerinc.com`);
    console.log(`    name:  ${name || '(not given)'}`);
    console.log(`    email: ${email}`);
    console.log(`    (dev stub — no mail sent)\n`);

    json(res, 200, { ok: true, message: 'You are on the list.' });
  });
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (url.pathname === '/signup.php') {
      if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method not allowed.' });
      return handleSignup(req, res);
    }

    const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      res.end(data);
    });
  })
  .listen(PORT, () => {
    console.log(`Envisioner preview → http://localhost:${PORT}`);
    console.log('signup.php is stubbed here; the real handler needs PHP on cPanel.');
  });
