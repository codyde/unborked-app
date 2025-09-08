CREATE TABLE IF NOT EXISTS feature_flags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    value BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    last_updated_by VARCHAR(255),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial flags
INSERT INTO feature_flags (name, value, description) VALUES
    ('STORE_CHECKOUT_ENABLED', false, 'Legacy flag, maintained for compatibility but not used functionally.'),
    ('MAIN_STORE', false, 'Legacy flag, maintained for compatibility but not used functionally.'),
    ('SITE_RELAUNCH', false, 'Enables the neo-brutalism basketball theme. Will cause checkout errors if enabled without BACKEND_V2.'),
    ('BACKEND_V2', false, 'Required for checkout to work with SITE_RELAUNCH. When both are enabled, checkout will function correctly.')
ON CONFLICT (name) DO NOTHING; 