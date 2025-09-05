# Deathwatch Roller

## Project Description
Deathwatch Roller is a React-based application designed to assist players and Game Masters in managing their sessions for the Deathwatch tabletop RPG. It includes features like player management, requisition shop, session tracking, and comprehensive GM tools.

## Features
- **Player Management**: Full CRUD operations for player accounts (GM only)
- **Requisition Shop**: Browse and purchase items with RP
- **Session Tracking**: Track game sessions and player progress
- **GM Kit**: Comprehensive Game Master tools and utilities
- **Bestiary**: Monster and enemy reference
- **Rules Database**: Searchable rules and game mechanics

## Quick Start

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/alexpolo1/dwroller.git
   cd dwroller
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Start the backend server:
   ```bash
   npm run server
   ```

The application will be available at `http://localhost:3000` with the API at `http://localhost:5000`.

### Production Deployment
For production deployment with PM2:
```bash
npm run build
npm run pm2:start
```

## Clean Repository
This repository is configured to exclude:
- Log files (`*.log`)
- Database files (`*.db`, `*.sqlite`)
- Backup files (`*backup*`, `backups/`)
- Temporary files
- PDF files (copyrighted content)

When you clone this repository, the database will be automatically created with the necessary tables on first run.

## GM Features
The application includes a comprehensive Player Management interface available only to Game Masters:
- Create and delete player accounts
- Manage requisition points, experience, and renown
- Reset player passwords
- Bulk operations for XP/RP management

## API Endpoints
- `GET /api/players` - Get all players (requires session)
- `POST /api/players/gm/*` - GM-only endpoints (requires x-gm-secret header)
- `GET /api/shop` - Get shop inventory
- `GET /api/bestiary` - Get bestiary data

## Contribution Guidelines
- Fork the repository
- Create a new branch for your feature or bug fix
- Follow the existing code style and patterns
- Add tests for new functionality
- Submit a pull request with a detailed description

## License
This project is licensed under the MIT License. See the LICENSE file for details.
