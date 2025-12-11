-- Add missing tables to MariaDB schema

-- Shop items table
CREATE TABLE IF NOT EXISTS shop_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    requisition_cost INT NOT NULL DEFAULT 0,
    renown_requirement VARCHAR(50) NOT NULL DEFAULT 'None',
    item_type VARCHAR(100) NOT NULL,
    stats TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Player inventory table
CREATE TABLE IF NOT EXISTS player_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transaction_details TEXT,
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES shop_items (id) ON DELETE CASCADE,
    UNIQUE(player_id, item_id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    item_id INT NOT NULL,
    requisition_cost INT NOT NULL,
    previous_rp INT NOT NULL,
    new_rp INT NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES shop_items (id) ON DELETE CASCADE
);

-- Armour table
CREATE TABLE IF NOT EXISTS armour (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    req INT DEFAULT 0,
    renown VARCHAR(50) DEFAULT 'None',
    category VARCHAR(100),
    stats TEXT,
    source VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weapons table
CREATE TABLE IF NOT EXISTS weapons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    req INT DEFAULT 0,
    renown VARCHAR(50) DEFAULT 'None',
    category VARCHAR(100),
    stats TEXT,
    source VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bestiary table
CREATE TABLE IF NOT EXISTS bestiary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    book VARCHAR(255),
    page VARCHAR(50),
    pdf VARCHAR(255),
    stats TEXT,
    profile TEXT,
    snippet TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rules table
CREATE TABLE IF NOT EXISTS rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_id VARCHAR(255) UNIQUE,
    title VARCHAR(500),
    content TEXT,
    page INT,
    source VARCHAR(255),
    source_abbr VARCHAR(50),
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to players table
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS requisition_points INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS renown_level VARCHAR(50) DEFAULT 'None';
