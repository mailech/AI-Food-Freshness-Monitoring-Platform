-- AI Food Freshness Monitoring Platform - PostgreSQL Initialization Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'consumer', 'retail_manager', 'warehouse_operator', 'food_inspector')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE TRIGGER update_users_modtime
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 2. Food Categories Table
CREATE TABLE food_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL CHECK (name IN ('Fruits', 'Vegetables', 'Meat', 'Seafood', 'Milk', 'Bakery', 'Packaged Foods', 'Beverages', 'Eggs', 'Frozen Foods')),
    ideal_temp_min NUMERIC(5, 2) NOT NULL, -- Celsius
    ideal_temp_max NUMERIC(5, 2) NOT NULL,
    ideal_humidity_min NUMERIC(5, 2) NOT NULL, -- Percentage
    ideal_humidity_max NUMERIC(5, 2) NOT NULL,
    base_shelf_life_days INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Batches Table
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    category_id UUID REFERENCES food_categories(id) ON DELETE CASCADE,
    supplier_name VARCHAR(255) NOT NULL,
    received_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_batches_number ON batches(batch_number);

CREATE TRIGGER update_batches_modtime
BEFORE UPDATE ON batches
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 4. Inventory Items Table
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES food_categories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.0,
    unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'Fresh' CHECK (status IN ('Fresh', 'Decaying', 'Spoiled', 'Expired')),
    freshness_score INTEGER DEFAULT 100 CHECK (freshness_score BETWEEN 0 AND 100),
    storage_temp NUMERIC(5, 2),
    storage_humidity NUMERIC(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_items_status ON inventory_items(status);
CREATE INDEX idx_inventory_items_expiry ON inventory_items(expiry_date);
CREATE INDEX idx_inventory_items_user ON inventory_items(user_id);

CREATE TRIGGER update_inventory_modtime
BEFORE UPDATE ON inventory_items
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 5. Environmental Storage Logs
CREATE TABLE storage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    temperature NUMERIC(5, 2) NOT NULL,
    humidity NUMERIC(5, 2) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_storage_logs_item ON storage_logs(inventory_item_id);
CREATE INDEX idx_storage_logs_recorded ON storage_logs(recorded_at);

-- 6. AI Image Analysis Results Table
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    color_score NUMERIC(5, 2) NOT NULL,     -- 0-100 index of discoloration
    texture_score NUMERIC(5, 2) NOT NULL,   -- 0-100 index of softness
    mold_detected BOOLEAN DEFAULT FALSE,
    bruise_detected BOOLEAN DEFAULT FALSE,
    damage_detected BOOLEAN DEFAULT FALSE,
    freshness_score INTEGER NOT NULL CHECK (freshness_score BETWEEN 0 AND 100),
    spoilage_probability NUMERIC(5, 4) NOT NULL CHECK (spoilage_probability BETWEEN 0.0 AND 1.0),
    remaining_shelf_life_days NUMERIC(6, 2) NOT NULL,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analysis_results_item ON analysis_results(inventory_item_id);

-- =============================================
-- Database Views
-- =============================================

-- View to display inventory items with their latest status and details
CREATE OR REPLACE VIEW inventory_summary_view AS
SELECT 
    i.id AS item_id,
    i.name AS item_name,
    c.name AS category_name,
    i.quantity,
    i.unit,
    i.added_at,
    i.expiry_date,
    i.status,
    i.freshness_score,
    b.batch_number,
    b.supplier_name,
    u.name AS owner_name,
    u.role AS owner_role,
    ar.color_score,
    ar.texture_score,
    ar.mold_detected,
    ar.bruise_detected,
    ar.damage_detected,
    ar.remaining_shelf_life_days,
    ar.image_url
FROM inventory_items i
JOIN food_categories c ON i.category_id = c.id
LEFT JOIN batches b ON i.batch_id = b.id
LEFT JOIN users u ON i.user_id = u.id
LEFT JOIN LATERAL (
    SELECT * FROM analysis_results 
    WHERE inventory_item_id = i.id 
    ORDER BY analyzed_at DESC LIMIT 1
) ar ON TRUE;

-- =============================================
-- Stored Procedures
-- =============================================

-- Procedure to update inventory statuses based on expiry dates
CREATE OR REPLACE PROCEDURE auto_mark_expired_items()
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE inventory_items
    SET status = 'Expired', freshness_score = 0
    WHERE expiry_date < NOW() AND status != 'Expired';
END;
$$;

-- =============================================
-- Database Triggers
-- =============================================

-- Trigger function to update inventory item status when analysis result is inserted
CREATE OR REPLACE FUNCTION sync_inventory_status_on_analysis()
RETURNS TRIGGER AS $$
DECLARE
    new_status VARCHAR(50);
BEGIN
    -- Determine status based on freshness score
    IF NEW.freshness_score >= 70 THEN
        new_status := 'Fresh';
    ELSIF NEW.freshness_score >= 40 THEN
        new_status := 'Decaying';
    ELSE
        new_status := 'Spoiled';
    END IF;

    -- Update inventory item
    UPDATE inventory_items
    SET status = new_status,
        freshness_score = NEW.freshness_score,
        updated_at = NOW()
    WHERE id = NEW.inventory_item_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_inventory_status
AFTER INSERT ON analysis_results
FOR EACH ROW EXECUTE FUNCTION sync_inventory_status_on_analysis();
