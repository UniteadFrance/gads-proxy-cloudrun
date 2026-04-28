const express = require('express');
const app = express();

app.use(express.json());

const PROXY_SECRET = process.env.PROXY_SECRET || 'unyx-gads-2026';

app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const secret = req.headers['x-proxy-secret'];
  if (secret !== PROXY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(async (req, res) => {
  const targetUrl = `https://googleads.googleapis.com${req.path}`;

  const headers = {
    'Authorization': req.headers['authorization'] || '',
    'developer-token': req.headers['developer-token'] || '',
    'Content-Type': 'application/json',
  };

  if (req.headers['login-customer-id']) {
    headers['login-customer-id'] = req.headers['login-customer-id'];
  }

  console.log(`[PROXY] ${req.method} ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const text = await response.text();
    console.log(`[PROXY] Status: ${response.status}`);
    res.status(response.status).set('Content-Type', 'application/json').send(text);

  } catch (error) {
    console.error('[PROXY] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
// v2
