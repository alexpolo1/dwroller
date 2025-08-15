# Database Migration: MongoDB to SQLite

## ✅ Migration Complete!

Your Deathwatch roller application has been successfully migrated from MongoDB to SQLite.

## What Was Done

1. **Data Export**: All player data was exported from MongoDB to a backup file
2. **SQLite Setup**: Created SQLite database with proper schema
3. **Data Migration**: Transferred all players and their data to SQLite
4. **API Update**: Updated server routes to use SQLite instead of MongoDB

## Migration Results

- **Total players migrated**: 3
- **Players**: christoffer, claes, phillip
- **Data preserved**: All player info, requisition points, inventory data
- **Backup created**: `mongo-backup.json` (safely stores original data)

## Files Created/Modified

### New Files:
- `sqlite-db.js` - SQLite database handler
- `routes/playerRoutes-sqlite.js` - Updated API routes for SQLite
- `server-sqlite.js` - SQLite server configuration
- `migrate-to-sqlite.js` - Migration script
- `switch-db.sh` - Database switching utility
- `mongo-backup.json` - Complete backup of MongoDB data
- `sqlite/deathwatch.db` - SQLite database file

### Modified Files:
- `server.js` - Now uses SQLite (MongoDB version backed up as `server-mongo-backup.js`)
- `package.json` - Added convenience scripts

## Usage

### Current Status
- ✅ SQLite is active
- ✅ Server running on port 3005 (or PORT env variable)
- ✅ All data migrated successfully

### New NPM Scripts
```bash
npm run server        # Start the server
npm run db:sqlite     # Switch to SQLite (current)
npm run db:mongo      # Switch back to MongoDB
npm run db:migrate    # Re-run migration
npm run db:export     # Export MongoDB data only
```

### Manual Operations
```bash
# Switch to SQLite
cd database && ./switch-db.sh sqlite

# Switch to MongoDB
cd database && ./switch-db.sh mongo

# Re-run migration
cd database && node migrate-to-sqlite.js

# Start server
cd database && node server.js
```

## Benefits of SQLite

1. **Simpler Deployment**: No separate database service needed
2. **Single File Database**: Easy backups and transfers
3. **Better for Small Apps**: Perfect for gaming groups
4. **Zero Configuration**: Works out of the box
5. **ACID Compliant**: Reliable data integrity

## Data Structure

The SQLite database maintains the same structure as MongoDB:
- `players` table with JSON columns for `rollerInfo`, `shopInfo`, `tabInfo`
- All existing player data preserved
- Password hashing maintained
- Timestamps added for better tracking

## Rollback

If you need to go back to MongoDB:
```bash
npm run db:mongo
```

This will restore your original MongoDB configuration. Your MongoDB data is unchanged.

## File Locations

- **SQLite Database**: `database/sqlite/deathwatch.db`
- **MongoDB Backup**: `database/mongo-backup.json`
- **Server Logs**: `database/backend.log`

## API Compatibility

The API endpoints remain exactly the same:
- `GET /api/players` - List all players
- `GET /api/players/:name` - Get specific player
- `PUT /api/players/:name` - Update player
- `POST /api/players` - Create player
- `DELETE /api/players/:name` - Delete player

Your frontend (React app) requires no changes.
