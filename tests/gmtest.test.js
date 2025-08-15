jest.setTimeout(20000);
const { execSync } = require('child_process');

describe('GM flow (create / update / login / delete)', () => {
  const name = 'gmtest';
  const baseURL = process.env.API_BASE || 'http://localhost:5000';
  const gmHeaders = `-H "x-gm-secret: ${process.env.GM_PASSWORD || 'bongo'}"`;

  const curl = (method, url, data = null, headers = '') => {
    const command = `curl -X ${method} ${headers} -H "Content-Type: application/json" ${data ? `-d '${JSON.stringify(data)}'` : ''} ${url}`;
    try {
      const result = execSync(command, { encoding: 'utf-8' });
      console.log(`Curl Command: ${command}`);
      console.log(`Curl Output: ${result}`);
      const parsedResult = JSON.parse(result);
      return {
        status: parsedResult.error ? 500 : (method === 'POST' && !url.endsWith('/login') ? 201 : 200),
        data: parsedResult.error ? null : parsedResult
      };
    } catch (error) {
      console.error(`Curl Error: ${error.message}`);
      console.error(`Curl Command: ${command}`);
      if (error.stdout) {
        console.error(`Curl Error Output: ${error.stdout}`);
      }
      throw error;
    }
  };

  test('should create, update, login and delete a gm-managed player', () => {
    // clean up any existing test player first
    try {
      curl('DELETE', `${baseURL}/api/players/${name}`, null, gmHeaders);
    } catch (e) {
      // ignore error if player doesn't exist
    }

    // create
    const createRes = curl('POST', `${baseURL}/api/players`, { name, rp: 10, pw: '1234' }, gmHeaders);
    expect(createRes.status).toBe(201);
    expect(createRes.data.name).toBe(name);

    // update RP
    const setRp = curl('PUT', `${baseURL}/api/players/${name}`, { tabInfo: { rp: 42 } }, gmHeaders);
    expect(setRp.status).toBe(200);
    expect(setRp.data.tabInfo && setRp.data.tabInfo.rp).toBe(42);

    // reset password
    const resetPw = curl('PUT', `${baseURL}/api/players/${name}`, { pw: '4321' }, gmHeaders);
    expect(resetPw.status).toBe(200);

    // login with new password
    const login = curl('POST', `${baseURL}/api/players/login`, { name, password: '4321' });
    expect(login.status).toBe(200);
    expect(login.data.sessionId).toBeTruthy();

    // delete
    const del = curl('DELETE', `${baseURL}/api/players/${name}`, null, gmHeaders);
    expect(del.status).toBe(200);

    // ensure not listed
    const list = curl('GET', `${baseURL}/api/players`, null, gmHeaders);
    const names = (list.data || []).map(p => p.name);
    expect(names).not.toContain(name);
  });
});
