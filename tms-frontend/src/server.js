import http from 'node:http';
import { URL } from 'node:url';

const port = Number(process.env.PORT) || 3000;
const backendHomeUrl = process.env.BACKEND_HOME_URL || 'http://localhost:4000/home';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/') {
    res.writeHead(302, { Location: '/home' });
    res.end();
    return;
  }

  if (url.pathname === '/home') {
    try {
      const backendResponse = await fetch(backendHomeUrl, {
        headers: { Accept: 'text/html' }
      });

      if (!backendResponse.ok) {
        throw new Error(`Backend responded with ${backendResponse.status}`);
      }

      const html = await backendResponse.text();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (error) {
      res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Backend unavailable</title>
  </head>
  <body>
    <h1>Backend unavailable</h1>
    <p>Start the backend server and reload this page.</p>
    <pre>${escapeHtml(error.message)}</pre>
  </body>
</html>`);
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.listen(port, () => {
  console.log(`Frontend server running at http://localhost:${port}`);
  console.log(`Displaying backend page from ${backendHomeUrl}`);
});

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
