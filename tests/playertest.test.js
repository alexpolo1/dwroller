jest.setTimeout(20000);
const { execSync } = require('child_process');

describe('Player flow (login, update sheet, gear/spend RP)', () => {
  const name = 'testplayer';
  const baseURL = process.env.API_BASE || 'http://localhost:5000';
  let sessionId;
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

  test('should login, update sheet, and manage gear/RP', () => {
    // create test player first
    try {
      curl('DELETE', `${baseURL}/api/players/${name}`, null, gmHeaders);
    } catch (e) {
      // ignore error if player doesn't exist
    }
    
    // create test player
    const create = curl('POST', `${baseURL}/api/players`, { name, rp: 10, pw: '1234' }, gmHeaders);
    expect(create.status).toBe(201);
    expect(create.data.name).toBe(name);
    
    // login as player
    const login = curl('POST', `${baseURL}/api/players/login`, { name, password: '1234' });
    expect(login.status).toBe(200);
    expect(login.data.sessionId).toBeTruthy();
    sessionId = login.data.sessionId;

    // spend RP and add gear
    const sessionHeader = `-H "x-session-id: ${sessionId}"`;
    const upd1 = curl('PUT', `${baseURL}/api/players/${name}`, { 
      tabInfo: { rp: 5, gear: [{ name: 'Test Knife', qty: 1 }] } 
    }, sessionHeader);
    expect(upd1.status).toBe(200);
    expect(upd1.data.tabInfo && upd1.data.tabInfo.rp).toBe(5);
    expect(Array.isArray(upd1.data.tabInfo.gear)).toBe(true);

    // update many sheet fields including skills
    const upd2 = curl('PUT', `${baseURL}/api/players/${name}`, {
      tabInfo: {
        playerName: 'Chris',
        charName: 'Brother-1',
        skills: ['Acrobatics (Ag)', 'Awareness (Per)', 'Medicae (Int)'],
        characteristics: { WS: 35, BS: 40 },
        rp: 4
      }
    }, sessionHeader);
    expect(upd2.status).toBe(200);
    expect(Array.isArray(upd2.data.tabInfo.skills)).toBe(true);
    expect(upd2.data.tabInfo.playerName).toBe('Chris');

    // cleanup - delete test player
    const del = curl('DELETE', `${baseURL}/api/players/${name}`, null, gmHeaders);
    expect(del.status).toBe(200);
  });
});
