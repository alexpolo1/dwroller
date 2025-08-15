const { execSync } = require('child_process');

function installMongoDB() {
  try {
    console.log('Installing gnupg and curl...');
    execSync('sudo apt-get install -y gnupg curl', { stdio: 'inherit' });

    console.log('Importing MongoDB public GPG key...');
    execSync('curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor', { stdio: 'inherit' });

    console.log('Creating MongoDB list file...');
    execSync('echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list', { stdio: 'inherit' });

    console.log('Reloading package database...');
    execSync('sudo apt-get update', { stdio: 'inherit' });

    console.log('Installing MongoDB Community Server...');
    execSync('sudo apt-get install -y mongodb-org', { stdio: 'inherit' });

    console.log('MongoDB installation completed successfully.');
  } catch (error) {
    console.error('Error during MongoDB installation:', error.message);
  }
}

installMongoDB();
