module.exports = {
  apps: [
    {
      name: 'deathwatch-server',
      script: './server.js',
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
