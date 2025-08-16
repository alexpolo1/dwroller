jest.setTimeout(20000);
const { execSync } = require('child_process');
const path = require('path');

describe('Rules endpoints', () => {
  const baseURL = process.env.API_BASE || 'http://localhost:5000';
  const gmHeaders = `-H "x-gm-secret: ${process.env.GM_PASSWORD || 'bongo'}"`;

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

  test('categories, search, random and stats endpoints respond', () => {
    const cats = curl('GET', `${baseURL}/api/rules/categories`);
    expect(Array.isArray(cats)).toBe(true);

    const search = curl('GET', `${baseURL}/api/rules/search?q=test`);
    expect(Array.isArray(search)).toBe(true);

    const randomRes = curl('GET', `${baseURL}/api/rules/random`);
    expect(Array.isArray(randomRes)).toBe(true);

    const stats = curl('GET', `${baseURL}/api/rules/stats`);
    expect(stats && typeof stats.totalRules === 'number').toBe(true);

    // Try reload without proper GM secret should fail
    const reloadFail = curl('POST', `${baseURL}/api/rules/reload`);
    expect(reloadFail && reloadFail.error).toBeTruthy();

    // Reload with GM secret
    const reloadOk = curl('POST', `${baseURL}/api/rules/reload`, null, gmHeaders);
    expect(reloadOk && typeof reloadOk.success === 'boolean').toBe(true);
  });
});
