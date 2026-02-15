-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- Domains table
CREATE TABLE IF NOT EXISTS domains (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    color TEXT,
    bg TEXT,
    icon TEXT,
    win TEXT,
    status TEXT,
    urgency TEXT,
    days INTEGER,
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat history table
CREATE TABLE IF NOT EXISTS chat_history (
    id BIGSERIAL PRIMARY KEY,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily logs table
CREATE TABLE IF NOT EXISTS daily_logs (
    id BIGSERIAL PRIMARY KEY,
    date TEXT NOT NULL,
    domain_id TEXT REFERENCES domains(id),
    minutes_spent INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security but allow all access via service key
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

-- Policies for service role (our serverless functions use service key)
CREATE POLICY "Allow all for service role" ON domains FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON chat_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON daily_logs FOR ALL USING (true) WITH CHECK (true);
