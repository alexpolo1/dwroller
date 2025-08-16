jest.setTimeout(20000);
const { execSync } = require('child_process');

describe('Shop endpoints (public and protected)', () => {
  const baseURL = process.env.API_BASE || 'http://localhost:5000';
  const gmHeaders = `-H "x-gm-secret: ${process.env.GM_PASSWORD || 'bongo'}"`;
  const mockPlayer = 'shoptestplayer';

  const curl = (method, url, data = null, headers = '') => {
    const command = `curl -s -X ${method} ${headers} -H "Content-Type: application/json" ${data ? `-d '${JSON.stringify(data)}'` : ''} ${url}`;
    try {
      const result = execSync(command, { encoding: 'utf-8' });
      return JSON.parse(result || '{}');
    } catch (error) {
      if (error.stdout) {
        try { return JSON.parse(error.stdout); } catch (e) { /* ignore */ }
      }
      throw error;
    }
  };

  test('public items endpoints work and protected inventory requires auth', () => {
    const items = curl('GET', `${baseURL}/api/shop/items`);
    expect(Array.isArray(items)).toBe(true);

    const category = curl('GET', `${baseURL}/api/shop/items/category/Gear`);
    expect(Array.isArray(category)).toBe(true);

    // create player to ensure inventory exists
    try { curl('DELETE', `${baseURL}/api/players/${mockPlayer}`, null, gmHeaders); } catch (e) {}
    const created = curl('POST', `${baseURL}/api/players`, { name: mockPlayer, rp: 20, pw: 'pw' }, gmHeaders);
    expect(created.name).toBe(mockPlayer);

    // Inventory without session should be protected (requireSession returns 403 or similar)
    const invNoAuth = curl('GET', `${baseURL}/api/shop/inventory/${mockPlayer}`);
    // invNoAuth should be an error object or not an array
    expect(Array.isArray(invNoAuth)).toBe(false);

    // cleanup
    curl('DELETE', `${baseURL}/api/players/${mockPlayer}`, null, gmHeaders);
  });
});
