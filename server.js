// Simple HTTP server for OAuth backend
// Run with: node server.js

import 'dotenv/config';
import http from 'http';
import { URL } from 'url';

const PORT = 3000;

// Your GitHub OAuth credentials from .env
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
  console.error('ERROR: Missing environment variables!');
  console.error('Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env file');
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // OAuth endpoint
  if (url.pathname === '/api/auth' && req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        console.log('Received body:', body);
        const { code } = JSON.parse(body);

        console.log('Extracted code:', code);

        if (!code) {
          console.error('Error: No code provided');
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Code is required' }));
          return;
        }

        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code: code,
          }),
        });

        const data = await tokenResponse.json();

        console.log('GitHub response:', data);

        if (data.error) {
          console.error('GitHub error:', data.error, data.error_description);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: data.error_description || data.error }));
          return;
        }

        console.log('Success! Returning access token');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ access_token: data.access_token }));
      } catch (error) {
        console.error('OAuth error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error', details: error.message }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`OAuth backend running on http://localhost:${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}/api/auth`);
  console.log(`\nUpdate index.html line 36 to:`);
  console.log(`OAUTH_CALLBACK_URL: 'http://localhost:${PORT}/api/auth'`);
});
