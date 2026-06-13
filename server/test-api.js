const http = require('http');

async function request(options, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  // Login first
  const loginRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/v1/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { email: 'mahndugn@gmail.com', password: 'admin123' }
  );
  console.log('=== LOGIN ===');
  console.log('Status:', loginRes.status);
  const token = loginRes.body.tokens?.access?.token;
  console.log('Token:', token ? token.substring(0, 50) + '...' : 'NO TOKEN');

  if (!token) return;

  // Test dashboard-stats
  const statsRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/v1/analytics/dashboard-stats', method: 'GET', headers: { 'Authorization': `Bearer ${token}` } },
    null
  );
  console.log('\n=== DASHBOARD STATS ===');
  console.log('Status:', statsRes.status);
  console.log('Data:', JSON.stringify(statsRes.body, null, 2));

  // Test analytics
  const analyticsRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/v1/analytics/analytics', method: 'GET', headers: { 'Authorization': `Bearer ${token}` } },
    null
  );
  console.log('\n=== ANALYTICS ===');
  console.log('Status:', analyticsRes.status);
  console.log('Data:', JSON.stringify(analyticsRes.body, null, 2));
}

main().catch(console.error);
