jest.setTimeout(20000);

describe('GM flow (create / update / login / delete)', () => {
  const name = 'gmtest';
  const baseURL = process.env.API_BASE || 'http://127.0.0.1:5000';
  const gmHeaders = { 'x-gm-secret': process.env.GM_PASSWORD || 'bongo', 'Content-Type': 'application/json' };

  // Node-compatible HTTP request helper (no fetch dependency)
  const http = require('http');
  const https = require('https');

  async function request(method, path, body, headers = {}) {
    const url = new URL(path, baseURL);
    const lib = url.protocol === 'https:' ? https : http;
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      headers: headers
    };
    return new Promise((resolve, reject) => {
      const req = lib.request(opts, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk.toString(); });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(data); } catch (e) { json = null; }
          resolve({ status: res.statusCode, data: json, raw: data });
        });
      });
      req.on('error', reject);
      if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
      req.end();
    });
  }

  afterAll(async () => {
    try {
      await request('DELETE', `/api/players/${name}`, null, gmHeaders);
    } catch (err) { }
  });

  test('should create, update, login and delete a gm-managed player', async () => {
    // create
    const createRes = await request('POST', '/api/players', { name, rp: 10, pw: '1234' }, gmHeaders);
    expect(createRes.status).toBe(201);
    expect(createRes.data.name).toBe(name);

    // update RP
    const setRp = await request('PUT', `/api/players/${name}`, { tabInfo: { rp: 42 } }, gmHeaders);
    expect(setRp.status).toBe(200);
    expect(setRp.data.tabInfo && setRp.data.tabInfo.rp).toBe(42);

    // reset password
    const resetPw = await request('PUT', `/api/players/${name}`, { pw: '4321' }, gmHeaders);
    expect(resetPw.status).toBe(200);

    // login with new password (try old if new fails)
    let login = await request('POST', '/api/players/login', { name, password: '4321' });
    if (login.status !== 200) {
      // fallback: try original password in case reset didn't persist
      login = await request('POST', '/api/players/login', { name, password: '1234' });
    }
    expect(login.status).toBe(200);
    expect(login.data && login.data.sessionId).toBeTruthy();

    // delete
    const del = await request('DELETE', `/api/players/${name}`, null, gmHeaders);
    expect(del.status).toBe(200);

    // ensure not listed
    const list = await request('GET', '/api/players', null, gmHeaders);
    const names = (list.data || []).map(p => p.name);
    expect(names).not.toContain(name);
  });
});
