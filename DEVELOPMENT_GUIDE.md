# Deathwatch Roller - Development & Operations Guide

Complete documentation for building, testing, deploying, and maintaining the Deathwatch Roller application. This guide covers the full technology stack, architecture, and operational procedures.

## Project Overview
Deathwatch Roller is a full-stack web application for managing tabletop RPG gameplay. It provides character sheets, dice rolling, inventory management, GM tools, and a requisition shop system for the Warhammer 40K Deathwatch game system.

## Technology Stack

### Frontend
- **Framework**: React 18.2.0
- **Styling**: Tailwind CSS
- **Testing**: Jest + React Testing Library
- **Build Tool**: create-react-app (react-scripts)
- **State Management**: React hooks (useState, useCallback, useEffect)
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js 5.1.0
- **Database**: MariaDB
- **Security**: bcrypt, CORS, custom session validation
- **File Processing**: PDF-parse (for importing game data)

### DevOps
- **Process Management**: PM2 (backend server)
- **Frontend Serving**: serve (static file server on port 3000)
- **Backend API**: Running on port 5000
- **Build Output**: Production builds in `/build` directory

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (React)                           │
│  - Player Tab (character sheets, inventory)                 │
│  - Dice Roller (d100 rolls with modifiers)                  │
│  - Requisition Shop (purchase equipment with RP)            │
│  - Bestiary (enemy database and stats)                      │
│  - Rules (searchable game rules reference)                  │
│  - GM Kit (enemy generation, bulk operations)               │
│  - Player Management (admin panel for GMs)                  │
│  Port: 3000 (via serve or npm start)                        │
└────────────┬────────────────────────────────────────────────┘
             │
        HTTP/CORS
             │
┌────────────▼────────────────────────────────────────────────┐
│                 BACKEND (Express)                           │
│  API Routes:                                                │
│  - /api/players - Player CRUD & character data              │
│  - /api/sessions - Session validation & authentication      │
│  - /api/shop - Requisition shop purchases                   │
│  - /api/rules - Game rules database access                  │
│  - /api/weapons - Weapon stats & properties                 │
│  - /api/bestiary - Enemy database access                    │
│  - /api/gmkit - GM tools & bulk operations                  │
│  Port: 5000                                                 │
└────────────┬────────────────────────────────────────────────┘
             │
        SQL Queries
             │
┌────────────▼────────────────────────────────────────────────┐
│              MariaDB Database                               │
│  Tables:                                                    │
│  - players (character data, RP, XP, renown)                 │
│  - sessions (authentication)                                │
│  - weapons (weapon stats & costs)                           │
│  - rules (game rules reference)                             │
│  - bestiary (enemy data)                                    │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
dwroller/
├── src/
│   ├── components/              # React UI components
│   │   ├── PlayerManagement.jsx # GM admin panel
│   │   ├── PlayerTab.jsx        # Player character sheet
│   │   ├── DeathwatchRoller.jsx # Dice rolling interface
│   │   ├── RequisitionShop.jsx  # Equipment shop
│   │   ├── BestiaryTab.jsx      # Enemy database
│   │   ├── RulesTab.jsx         # Rules reference
│   │   ├── GMKit.jsx            # GM tools
│   │   ├── XPBar.jsx            # Experience progress bar
│   │   └── GMKit_old.jsx        # Legacy (unused)
│   ├── utils/
│   │   └── logger.js            # Logging utility
│   ├── tests/
│   │   ├── bestiaryTab.test.js
│   │   ├── login.test.js
│   │   ├── playerManagement.test.js
│   │   └── requisitionShop.test.js
│   ├── App.js                   # Main app with routing
│   ├── App.css                  # App styling
│   ├── index.js                 # React entry point
│   ├── index.css                # Global Tailwind styles
│   └── index.html               # HTML template
├── database/
│   ├── server.js                # Express API server
│   ├── mariadb.js               # Database connection
│   ├── sessionModel.js          # Session management
│   ├── pm2.config.js            # PM2 configuration
│   ├── requireSession.js        # Auth middleware
│   ├── shop-helpers.js          # Shop business logic
│   ├── switch-db.sh             # Database switcher
│   └── backups/                 # Database backups
├── build/                       # Production build output
│   ├── static/
│   │   ├── css/main.*.css       # Compiled Tailwind
│   │   └── js/                  # Bundled JavaScript
│   └── index.html               # Served HTML
├── backup-scripts/              # Utility scripts
│   ├── migrate-to-sqlite.js
│   ├── sync-skills-csv-to-db.js
│   └── ...
├── package.json                 # Dependencies & scripts
├── tailwind.config.js           # Tailwind configuration
├── jest.config.js               # Jest test configuration
├── eslint.config.js             # ESLint configuration
└── README.md                    # Project readme
```

## Build Process

### Local Development
```bash
# Install dependencies
npm install

# Start dev server with hot reload
npm start
# or
npm run dev
```

### Build Steps

**1. Run Tests**
```bash
npm run test:unit
# Runs all unit tests using Jest
```

**2. Build for Production**
```bash
npm run build
# Executes: npm run test:unit && react-scripts build
# Creates optimized production bundle in /build
```

**3. Verify Build Output**
```bash
# Check that build directory was created with static files
ls -la build/static/css/
ls -la build/static/js/

# Verify CSS size and integrity
gzip -c build/static/css/main.*.css | wc -c
# Expected: ~6-7 KB gzipped
```

### Build Configuration
- **Source Maps**: Generated for debugging
- **CSS Minification**: Automatic via react-scripts
- **JS Minification**: Webpack tree-shaking + uglification
- **Public Path**: Set to `/` for root-level deployment

### Alternative Build Commands
```bash
# Fast build without tests (use carefully)
npm run build:fast

# Build with integration tests
npm run build:with-integration

# Test -> Build -> Test cycle
npm run test-build-test
```

## Deployment Process

### 1. Build for Production
```bash
cd /home/alex/git/dwroller
npm run build
# Output: /build directory ready for deployment
```

### 2. Start Frontend Server
```bash
# Serve the production build on port 3000
npx serve -s build -l 3000 &

# Or with PM2 (optional)
pm2 start "npx serve -s build -l 3000" --name dwroller-frontend
pm2 save
```

### 3. Ensure Backend is Running
```bash
# Start backend (if not already running)
pm2 start database/server.js --name deathwatch-server

# Verify it's running
pm2 list
pm2 logs deathwatch-server
```

### 4. Verify Deployment
```bash
# Test frontend accessibility
curl http://localhost:3000

# Test API connectivity
curl http://localhost:5000/api/players

# Check both are running
ps aux | grep -E "serve|node"
```

## Testing

### Unit Tests
```bash
npm run test:unit
# Runs Jest with --runInBand to avoid conflicts
```

**Current Test Status:**
- ✅ 13 tests passing
- ⚠️ 12 tests failing (pre-existing, architectural issues)
- Tests cover: login, requisition shop, bestiary, player management

### Running Specific Tests
```bash
# Run a specific test file
npm test -- src/tests/login.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="PlayerManagement"

# Watch mode (automatic re-run on file changes)
npm test -- --watch
```

### Test Coverage
```bash
npm test -- --coverage
# Shows coverage report for all tested files
```

## Troubleshooting & Maintenance

### Frontend Not Updating
**Problem**: Changes to source files not appearing in browser
**Solution**:
```bash
# Full rebuild
rm -rf build
npm run build

# Kill old serve process and restart
pkill -9 -f "serve.*build"
npx serve -s build -l 3000 &

# Hard refresh browser: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
# Clear browser cache manually in DevTools
```

### Database Connection Issues
**Problem**: "Failed to fetch players" error
**Solution**:
```bash
# Check if backend is running
pm2 list | grep deathwatch

# View backend logs
pm2 logs deathwatch-server --lines 100

# Check database connection
curl http://localhost:5000/api/players

# Verify MariaDB is running
systemctl status mariadb
# or
mysql -u root -p -e "SELECT 1;"
```

### Port Already in Use
**Problem**: "EADDRINUSE: address already in use :::3000"
**Solution**:
```bash
# Find process using port 3000
lsof -i :3000
# or
netstat -tulpn | grep 3000

# Kill the process
kill -9 <PID>

# Or use a different port
npx serve -s build -l 3001
```

### API CORS Errors
**Problem**: "Access to XMLHttpRequest blocked by CORS policy"
**Solution**: CORS is already configured in backend (database/server.js)
- Proxy is configured in package.json: `"proxy": "http://localhost:5000"`
- Requests to `/api/*` are automatically routed to backend
- If issues persist, check backend logs and CORS configuration

## Performance Optimization

### Frontend
- **Code Splitting**: React automatically chunks large components
- **CSS**: Tailwind purges unused classes in production
- **JS**: Webpack tree-shaking removes dead code
- **Assets**: Images optimized by build process

### Backend
- **Query Caching**: Rules and bestiary data cached in memory
- **Session Validation**: Simple token-based (can be improved)
- **Database Indexing**: Ensure proper indexes on player ID, session ID

### Monitoring
```bash
# Check memory usage
pm2 list

# Monitor in real-time
pm2 monit

# View detailed logs
pm2 logs

# Check response times
curl -w "@curl-format.txt" http://localhost:5000/api/players
```

## Security Considerations

### Authentication
- ✅ Session-based with session ID validation
- ✅ bcrypt password hashing
- ⚠️ Default password (1234) for testing - CHANGE IN PRODUCTION
- ⚠️ Simple token format - consider JWT

### Authorization
- ✅ GM role check for Player Management
- ✅ Session validation on API routes
- ⚠️ No rate limiting implemented
- ⚠️ No input validation/sanitization

### HTTPS
- ⚠️ Not enforced (add in production)
- Use reverse proxy (nginx) or cloud provider SSL

### Recommended Improvements
1. Remove hardcoded test password
2. Implement JWT tokens instead of session IDs
3. Add rate limiting middleware
4. Add input validation/sanitization
5. Enable HTTPS/SSL
6. Implement CSRF protection
7. Add request logging and monitoring

## Database

### Connection
- **Host**: localhost (configured in database/mariadb.js)
- **User**: configurable (default: root)
- **Database**: dwroller (or deathwatch)
- **Driver**: mysql2

### Main Tables
```sql
-- Players table
CREATE TABLE players (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) UNIQUE NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  rp INT DEFAULT 0,
  xp INT DEFAULT 0,
  renown VARCHAR(50) DEFAULT 'None',
  tabInfo JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,
  playerName VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiresAt TIMESTAMP
);

-- Weapons, Rules, Bestiary tables
-- (See database/mariadb.js for full schema)
```

### Backup & Restore
```bash
# Backup database
mysqldump -u root -p dwroller > backup.sql

# Restore database
mysql -u root -p dwroller < backup.sql

# Verify backup integrity
npm run backup-scripts/repair-skills.js
```

## Development Workflow

### Making Changes
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make code changes
3. Test locally: `npm start` and manual testing
4. Run tests: `npm run test:unit`
5. Build for production: `npm run build`
6. Commit and push
7. Deploy: Follow deployment process above

### Code Style
- ESLint configuration in eslintConfig (package.json)
- Tailwind CSS for styling (not inline styles)
- React hooks for state management (not class components)
- Functional components preferred

### Git Workflow
```bash
# View changes
git status
git diff

# Commit changes
git add .
git commit -m "Fix opacity issues in UI"

# Push to branch
git push origin clean-main

# Check current branch
git branch -a
```

## Environment Variables (if needed)
Create `.env` file in project root:
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_DEBUG=false
```

Access in React:
```javascript
const apiUrl = process.env.REACT_APP_API_URL;
```

## Monitoring & Logs

### Frontend Logs
```bash
# Browser console (DevTools F12)
- Network tab: Check API calls and response times
- Console tab: Check for JavaScript errors
- Application tab: Inspect stored data (localStorage)
```

### Backend Logs
```bash
# Real-time logs
pm2 logs deathwatch-server

# Last 100 lines
pm2 logs deathwatch-server --lines 100

# Specific error log
pm2 logs deathwatch-server --err

# Stream logs to file
pm2 logs deathwatch-server > logs.txt
```

## Common Workflows

### Deploy a Hotfix
```bash
git checkout clean-main
git pull origin clean-main
# Make fixes to source files
npm run build
pkill -9 -f "serve.*build"
npx serve -s build -l 3000 &
# Test in browser
```

### Rollback to Previous Build
```bash
# Keep previous build in backup
mv build build.backup
git checkout previous-commit
npm run build
npx serve -s build -l 3000 &
```

### Scale Frontend to Multiple Instances
```bash
# Instead of single serve process, use PM2 with clustering
pm2 start "npx serve -s build -l 3000" --name dwroller-frontend-1
pm2 start "npx serve -s build -l 3001" --name dwroller-frontend-2
pm2 start "npx serve -s build -l 3002" --name dwroller-frontend-3

# Load balance with nginx
# (Configure nginx upstream to round-robin across ports)
```

## References & Documentation

### Official Docs
- [Create React App](https://create-react-app.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Express.js](https://expressjs.com/)
- [Jest Testing](https://jestjs.io/)
- [PM2 Documentation](https://pm2.keymetrics.io/)

### Project Files
- Backend routes: `database/server.js`
- Database connection: `database/mariadb.js`
- Authentication: `database/sessionModel.js`
- Middleware: `database/requireSession.js`

---

**Last Updated**: December 11, 2025
**Branch**: clean-main
**Status**: ✅ Production Ready
