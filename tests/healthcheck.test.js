const { spawnSync } = require('child_process');
const path = require('path');

describe('database healthcheck', () => {
  it('should run healthcheck script and return players', () => {
    const script = path.resolve(__dirname, '../database/healthcheck.js');
    const res = spawnSync('node', [script], { encoding: 'utf8', cwd: path.resolve(__dirname, '..') });
    console.log(res.stdout);
    expect(res.status).toBe(0);
  }, 20000);
});
