const express = require('express');
const app = express();

app.use(express.json());

const PROXY_SECRET = process.env.PROXY_SECRET || 'unyx-gads-2026';

// Vérification clé secrète
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const secret = req.headers['x-proxy-secret'];
  if (secret !== PROXY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Proxy vers googleads.googleapis.com
app.all('*', async (req, res) => {
  const targetUrl = `https://googleads.googleapis.com${req.path}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`;

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
    const fetchOptions = {
      method: req.method,
      headers,
    };

    if (req.method !== 'GET' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const text = await response.text();

    console.log(`[PROXY] Response status: ${response.status}`);

    res.status(response.status)
       .set('Content-Type', 'application/json')
       .send(text);

  } catch (error) {
    console.error('[PROXY] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Google Ads Proxy running on port ${PORT}`);
});
