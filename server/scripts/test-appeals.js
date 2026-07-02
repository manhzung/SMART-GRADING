#!/usr/bin/env node
/**
 * Quick test for the appeals API using the same account as the user.
 * Run from the server directory:
 *   node scripts/test-appeals.js [submissionId]
 */
const http = require('http');

function req(opts, data) {
  return new Promise((resolve, reject) => {
    const r = http.request({ hostname: 'localhost', port: 3000, ...opts }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(b) });
        } catch {
          resolve({ status: res.statusCode, body: b });
        }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  const targetSub = process.argv[2];
  const login = await req(
    {
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    JSON.stringify({ email: 'anh.nv@student.edu', password: 'admin123' })
  );
  console.log('Login:', login.status, login.body?.user?.email);
  const token = login.body.tokens.access.token;
  const H = { Authorization: 'Bearer ' + token };

  const subs = await req({ path: '/api/v1/submissions/me?page=1&limit=20', method: 'GET', headers: H });
  console.log('\nYour submissions:');
  for (const s of subs.body.results) {
    const marker = targetSub && s._id === targetSub ? ' <-- target' : '';
    console.log(' ', s._id, '|', s.examId?.title || s.examId, '|', s.status, marker);
    const appeals = await req({ path: '/api/v1/appeals/me?submissionId=' + s._id, method: 'GET', headers: H });
    console.log('   appeals:', appeals.body.total);
    appeals.body.results.forEach((a, i) => {
      console.log('     -', a.status, '|', a.reason?.slice(0, 60));
    });
  }
})();
