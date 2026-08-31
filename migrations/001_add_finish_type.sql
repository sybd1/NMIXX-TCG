-- Migration: 001_add_finish_type.sql
-- Description: Add finish_type column to UserCard table with default 'MATTE' and index

-- 1. Create FinishType Enum (PostgreSQL compatibility)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finish_type_enum') THEN
        CREATE TYPE finish_type_enum AS ENUM (
            'MATTE',
            'GLOSSY',
            'SILVER_STAMPING',
            'RAINBOW_FOIL',
            'SHATTERED_GLASS',
            'PRISM_GLITTER',
            'TEXTURE_GOLD',
            'COSMIC_GHOST'
        );
    END IF;
END
$$;

-- 2. Add column with default 'MATTE' to ensure zero downtime and backwards compatibility
ALTER TABLE IF EXISTS user_cards 
ADD COLUMN IF NOT EXISTS finish_type VARCHAR(32) NOT NULL DEFAULT 'MATTE';

-- Add Check Constraint if ENUM is not strictly enforced at DB level
ALTER TABLE IF EXISTS user_cards 
DROP CONSTRAINT IF EXISTS check_valid_finish_type;

ALTER TABLE IF EXISTS user_cards 
ADD CONSTRAINT check_valid_finish_type 
CHECK (finish_type IN ('MATTE', 'GLOSSY', 'SILVER_STAMPING', 'RAINBOW_FOIL', 'SHATTERED_GLASS', 'PRISM_GLITTER', 'TEXTURE_GOLD', 'COSMIC_GHOST'));

-- 3. Create Index for querying cards by finish rarity
CREATE INDEX IF NOT EXISTS idx_user_cards_finish_type ON user_cards (finish_type);
