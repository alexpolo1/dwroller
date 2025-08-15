jest.setTimeout(20000);

describe('Player flow (login, update sheet, gear/spend RP)', () => {
  const name = 'christoffer';
  const baseURL = process.env.API_BASE || 'http://127.0.0.1:5000';
  let sessionId;

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
      headers: { 'Content-Type': 'application/json', ...headers }
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

  test('login as player and get session', async () => {
    const res = await request('POST', '/api/players/login', { name, password: '1234' });
    expect(res.status).toBe(200);
    expect(res.data.sessionId).toBeTruthy();
    sessionId = res.data.sessionId;
  });

  test('spend RP and add gear', async () => {
    const headers = { 'x-session-id': sessionId };
    const upd = await request('PUT', `/api/players/${name}`, { tabInfo: { rp: 5, gear: [{ name: 'Test Knife', qty: 1 }] } }, headers);
    expect(upd.status).toBe(200);
    expect(upd.data.tabInfo && upd.data.tabInfo.rp).toBe(5);
    expect(Array.isArray(upd.data.tabInfo.gear)).toBe(true);
  });

  test('update many sheet fields including skills', async () => {
    const headers = { 'x-session-id': sessionId };
    const body = {
      playerName: 'Chris',
      charName: 'Brother-1',
      skills: ['Acrobatics (Ag)', 'Awareness (Per)', 'Medicae (Int)'],
      characteristics: { WS: 35, BS: 40 },
      rp: 4
    };
    const upd = await request('PUT', `/api/players/${name}`, body, headers);
    expect(upd.status).toBe(200);
    expect(Array.isArray(upd.data.tabInfo.skills)).toBe(true);
    expect(upd.data.tabInfo.playerName).toBe('Chris');
  });
});
