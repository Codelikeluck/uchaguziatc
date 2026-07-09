-- SOATECO Blockchain Voting System - Neon PostgreSQL Schema
-- Run this SQL in your Neon database console to set up tables.
-- Columns match the CSV/Excel upload fields (admission_number, name, email, department, year_of_study, phone).

-- ========== STUDENTS (matches CSV columns exactly) ==========
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  admission_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  department TEXT,
  year_of_study INTEGER DEFAULT 1,
  phone TEXT,
  has_voted BOOLEAN DEFAULT FALSE,
  wallet_address TEXT
);

-- ========== CANDIDATES ==========
CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  manifesto TEXT,
  image_url TEXT,
  documents JSONB DEFAULT '[]',
  gpa NUMERIC DEFAULT 0,
  year_of_study INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  votes INTEGER DEFAULT 0
);

-- ========== ELECTIONS ==========
CREATE TABLE IF NOT EXISTS elections (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  positions JSONB DEFAULT '[]',
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'completed')),
  total_voters INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0
);

-- ========== VOTES ==========
CREATE TABLE IF NOT EXISTS votes (
  vote_hash TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  candidate_id TEXT REFERENCES candidates(id) ON DELETE SET NULL,
  election_id TEXT REFERENCES elections(id) ON DELETE SET NULL,
  timestamp BIGINT NOT NULL
);

-- ========== BLOCKS (blockchain) ==========
CREATE TABLE IF NOT EXISTS blocks (
  block_index INTEGER PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  previous_hash TEXT NOT NULL DEFAULT '',
  hash TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  nonce INTEGER DEFAULT 0
);

-- ========== AUDIT EVENTS ==========
CREATE TABLE IF NOT EXISTS audit_events (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  data TEXT,
  timestamp BIGINT NOT NULL,
  user_id TEXT
);

-- ========== OTPs (auto-cleaned) ==========
CREATE TABLE IF NOT EXISTS otps (
  identifier TEXT PRIMARY KEY,
  otp TEXT NOT NULL,
  expires BIGINT NOT NULL
);

-- ========== ADMIN SESSIONS (no expiry — valid until sign out) ==========
CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  username TEXT NOT NULL
);

-- ========== ADMINS (login credentials) ==========
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin')),
  created_at BIGINT NOT NULL
);

-- Insert default superadmin (password: ATC_Secure2024!)
INSERT INTO admins (id, username, password_hash, role, created_at)
VALUES ('admin_default', 'soateco_admin', '5d9f4d2d8c9f3b0a2e8c7d1b6a4f3e2c1d5b8a7c9f0e3d2b1a4c6e8f0d9b7a', 'superadmin', EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT (id) DO NOTHING;

-- ========== SNAPSHOTS (for JSONB full-state persistence) ==========
CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ========== INDEXES for performance ==========
CREATE INDEX IF NOT EXISTS idx_students_admission ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_department ON students(department);
CREATE INDEX IF NOT EXISTS idx_students_year ON students(year_of_study);
CREATE INDEX IF NOT EXISTS idx_candidates_position ON candidates(position);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_votes_election ON votes(election_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_otps_expires ON otps(expires);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_username ON admin_sessions(username);
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
