#!/bin/bash

# Deathwatch Roller Database Switcher
# Usage: ./switch-db.sh [mongo|sqlite]

DB_TYPE=${1:-sqlite}

echo "Switching to $DB_TYPE database..."

if [ "$DB_TYPE" = "sqlite" ]; then
    echo "Setting up SQLite configuration..."
    
    # Backup current server.js if it exists
    if [ -f "server.js" ]; then
        cp server.js server-mongo-backup.js
        echo "✓ Backed up MongoDB server.js to server-mongo-backup.js"
    fi
    
    # Use SQLite server
    cp server-sqlite.js server.js
    echo "✓ Using SQLite server configuration"
    
    echo "✓ SQLite database is ready at: database/sqlite/deathwatch.db"
    echo "✓ Your data has been migrated from MongoDB"
    
elif [ "$DB_TYPE" = "mongo" ]; then
    echo "Setting up MongoDB configuration..."
    
    # Restore MongoDB server if backup exists
    if [ -f "server-mongo-backup.js" ]; then
        cp server-mongo-backup.js server.js
        echo "✓ Restored MongoDB server configuration"
    else
        echo "⚠ No MongoDB backup found. You may need to recreate server.js for MongoDB"
    fi
    
    echo "✓ MongoDB configuration restored"
    echo "⚠ Make sure MongoDB service is running"
    
else
    echo "❌ Invalid database type. Use 'mongo' or 'sqlite'"
    exit 1
fi

echo ""
echo "Database switch complete!"
echo "Restart your server to use the new configuration:"
echo "  cd database && node server.js"
