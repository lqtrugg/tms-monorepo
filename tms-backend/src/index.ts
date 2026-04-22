import express from 'express';

const app = express();
const port = Number(process.env.PORT) || 4000;

app.get('/home', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>TMS Backend Home</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Arial, sans-serif;
        background: #f6f8fb;
        color: #172033;
      }

      main {
        max-width: 560px;
        padding: 32px;
        text-align: center;
      }

      h1 {
        margin: 0 0 12px;
        font-size: 32px;
      }

      p {
        margin: 0;
        color: #526070;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Backend Home Page</h1>
      <p>This page is served by the Express backend at <strong>/home</strong>.</p>
    </main>
  </body>
</html>`);
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use((_req, res) => {
  res.status(404).send('Not found');
});

const server = app.listen(port);

server.on('listening', () => {
  console.log(`Backend server running at http://localhost:${port}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(`Failed to start backend server: ${error.message}`);
  process.exit(1);
});
