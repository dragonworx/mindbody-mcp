
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  status TEXT,
  raw_data JSON,
  last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_last_synced ON clients(last_synced_at);

CREATE TABLE IF NOT EXISTS api_usage (
  date DATE PRIMARY KEY,
  count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  sale_date DATETIME,
  client_id TEXT,
  total_amount REAL,
  raw_data JSON,
  last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_client ON sales(client_id);

CREATE TABLE IF NOT EXISTS sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  operation TEXT,
  status TEXT,
  message TEXT,
  details JSON
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_timestamp ON sync_logs(timestamp);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  start_date_time DATETIME,
  end_date_time DATETIME,
  client_id TEXT,
  staff_id TEXT,
  location_id TEXT,
  session_type_id TEXT,
  status TEXT,
  raw_data JSON,
  last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointments_start_date ON appointments(start_date_time);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff ON appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_location ON appointments(location_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  hit_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at);

CREATE TABLE IF NOT EXISTS bookable_items (
  id TEXT PRIMARY KEY,
  name TEXT,
  session_type_id TEXT,
  program_id TEXT,
  raw_data JSON,
  last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookable_items_session_type ON bookable_items(session_type_id);
CREATE INDEX IF NOT EXISTS idx_bookable_items_program ON bookable_items(program_id);

CREATE TABLE IF NOT EXISTS api_response_cache (
  cache_key TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  params TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  hit_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_api_cache_endpoint ON api_response_cache(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_cache_created ON api_response_cache(created_at);
`;
