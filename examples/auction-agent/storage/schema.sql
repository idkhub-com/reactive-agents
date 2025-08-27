-- Auction Agent Storage Schema
-- Phase 4: Persistence and history tracking

PRAGMA foreign_keys = ON;

-- Runs table: Track each execution of the agent
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  search_criteria TEXT NOT NULL, -- JSON
  scraper_mode TEXT NOT NULL, -- 'mock' | 'real'
  vehicle_count INTEGER NOT NULL DEFAULT 0,
  analysis_count INTEGER NOT NULL DEFAULT 0,
  llm_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running', -- 'running' | 'completed' | 'failed'
  error_message TEXT,
  duration_ms INTEGER,
  export_path TEXT
);

-- Vehicles table: Deduplicated vehicle data
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY, -- lot_number or generated ID
  vin TEXT,
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  mileage INTEGER NOT NULL,
  damage TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  sale_status TEXT NOT NULL,
  images TEXT, -- JSON array
  
  -- Auction details
  current_bid REAL NOT NULL,
  estimated_value REAL NOT NULL,
  auction_end_time TEXT,
  lot_number TEXT,
  
  -- Tool results
  tool_results TEXT, -- JSON
  
  -- Metadata
  first_seen TEXT NOT NULL DEFAULT (datetime('now')),
  last_updated TEXT NOT NULL DEFAULT (datetime('now')),
  seen_count INTEGER NOT NULL DEFAULT 1,
  
  UNIQUE(lot_number, vin) -- Prevent duplicates by lot+VIN
);

-- Run vehicles: Many-to-many relationship tracking which vehicles appeared in which runs
CREATE TABLE IF NOT EXISTS run_vehicles (
  run_id TEXT NOT NULL,
  vehicle_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  PRIMARY KEY (run_id, vehicle_id),
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- Analyses table: Store analysis results with history
CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  vehicle_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  -- Analysis results
  score INTEGER NOT NULL,
  reasoning TEXT NOT NULL,
  recommendation TEXT NOT NULL, -- 'buy' | 'monitor' | 'pass'
  
  -- Market comparison
  market_average_price REAL,
  market_price_difference REAL,
  market_trend TEXT, -- 'above' | 'below' | 'average'
  
  -- Risk assessment
  risk_level TEXT, -- 'low' | 'medium' | 'high'
  risk_score INTEGER,
  risk_factors TEXT, -- JSON array
  
  -- Analysis type
  analysis_type TEXT NOT NULL DEFAULT 'heuristic', -- 'llm' | 'heuristic'
  model_used TEXT,
  
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON vehicles(make, model);
CREATE INDEX IF NOT EXISTS idx_vehicles_year ON vehicles(year);
CREATE INDEX IF NOT EXISTS idx_vehicles_price ON vehicles(current_bid);
CREATE INDEX IF NOT EXISTS idx_vehicles_last_updated ON vehicles(last_updated);
CREATE INDEX IF NOT EXISTS idx_analyses_score ON analyses(score);
CREATE INDEX IF NOT EXISTS idx_analyses_recommendation ON analyses(recommendation);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at);

-- Views for common queries
CREATE VIEW IF NOT EXISTS latest_vehicle_analyses AS
SELECT 
  v.*,
  a.score,
  a.reasoning,
  a.recommendation,
  a.risk_level,
  a.analysis_type,
  a.created_at as analysis_date
FROM vehicles v
JOIN analyses a ON v.id = a.vehicle_id
WHERE a.created_at = (
  SELECT MAX(created_at) 
  FROM analyses a2 
  WHERE a2.vehicle_id = v.id
);

CREATE VIEW IF NOT EXISTS run_summary AS
SELECT 
  r.*,
  COUNT(rv.vehicle_id) as actual_vehicle_count,
  COUNT(a.id) as actual_analysis_count,
  AVG(a.score) as avg_score,
  COUNT(CASE WHEN a.recommendation = 'buy' THEN 1 END) as buy_recommendations
FROM runs r
LEFT JOIN run_vehicles rv ON r.id = rv.run_id
LEFT JOIN analyses a ON r.id = a.run_id
GROUP BY r.id;
