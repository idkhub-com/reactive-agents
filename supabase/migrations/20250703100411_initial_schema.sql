-- ================================================
-- Agents table
-- ================================================
CREATE TABLE if not exists agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON agents FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- Skills table
-- ================================================
CREATE TABLE if not exists skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  UNIQUE(agent_id, name)
);

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_skills_agent_id ON skills(agent_id);

CREATE INDEX idx_skills_name ON skills(name);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON skills FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- Tools table
-- ================================================
CREATE TABLE if not exists tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL,
  hash TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  raw_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  UNIQUE(agent_id, hash)
);

CREATE TRIGGER update_tools_updated_at BEFORE UPDATE ON tools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_tools_agent_id ON tools(agent_id);

CREATE INDEX idx_tools_hash ON tools(hash);

CREATE INDEX idx_tools_type ON tools(type);

CREATE INDEX idx_tools_name ON tools(name);

ALTER TABLE tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON tools FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- Logs table
-- ================================================
-- Define enum types first
CREATE TYPE http_method AS ENUM ('GET', 'POST', 'PUT', 'DELETE', 'PATCH');

CREATE TYPE cache_status_enum AS ENUM (
  'HIT',
  'SEMANTIC_HIT',
  'MISS',
  'SEMANTIC_MISS',
  'REFRESH',
  'DISABLED'
);

CREATE TABLE IF NOT EXISTS logs (
  -- Base info
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL,
  skill_id UUID NOT NULL,
  method http_method NOT NULL,
  endpoint TEXT NOT NULL,
  function_name TEXT NOT NULL,
  status INTEGER NOT NULL,
  start_time BIGINT NOT NULL,
  end_time BIGINT NOT NULL,
  duration BIGINT NOT NULL,
  base_idk_config JSONB NOT NULL,
  -- Maybe redundant. Used for indexing.
  ai_provider TEXT NOT NULL,
  model TEXT NOT NULL,
  -- Main data
  ai_provider_request_log JSONB NOT NULL,
  hook_logs JSONB NOT NULL,
  metadata JSONB NOT NULL,
  -- Cache info
  cache_status cache_status_enum NOT NULL,
  -- Tracing info
  trace_id TEXT,
  parent_span_id TEXT,
  span_id TEXT,
  span_name TEXT,
  -- User metadata
  app_id TEXT,
  external_user_id TEXT,
  external_user_human_name TEXT,
  user_metadata JSONB,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE INDEX idx_logs_agent_id ON logs(agent_id);

CREATE INDEX idx_logs_skill_id ON logs(skill_id);

CREATE INDEX idx_logs_start_time ON logs(start_time);

CREATE INDEX idx_logs_end_time ON logs(end_time);

CREATE INDEX idx_logs_app_id ON logs(app_id);

CREATE INDEX idx_logs_span_id ON logs(span_id);

CREATE INDEX idx_logs_parent_span_id ON logs(parent_span_id);

CREATE INDEX idx_logs_status ON logs(status);

CREATE INDEX idx_logs_method ON logs(method);

CREATE INDEX idx_logs_cache_status ON logs(cache_status);

-- Enable Row Level Security
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only service_role can access logs
CREATE POLICY "service_role_full_access" ON logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- Feedback table
-- ================================================
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_id UUID NOT NULL,
  score FLOAT CHECK (
    score >= 0
    AND score <= 1
  ),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE
);

ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON feedbacks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- Improved responses table
-- ================================================
CREATE TABLE if not exists improved_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL,
  skill_id UUID NOT NULL,
  log_id UUID NOT NULL,
  original_response_body JSONB NOT NULL,
  improved_response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE
);

CREATE TRIGGER update_improved_responses_updated_at BEFORE UPDATE ON improved_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_improved_responses_agent_id ON improved_responses(agent_id);

CREATE INDEX idx_improved_responses_skill_id ON improved_responses(skill_id);

CREATE INDEX idx_improved_responses_log_id ON improved_responses(log_id);

ALTER TABLE improved_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON improved_responses FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- Datasets table
-- ================================================
CREATE TABLE if not exists datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agent_id, name),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON datasets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_datasets_name ON datasets(name);

CREATE INDEX idx_datasets_agent_id ON datasets(agent_id);

ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON datasets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- Data points table
-- ================================================
CREATE TABLE if not exists data_points (
  -- Base info
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hash TEXT NOT NULL,
  method http_method NOT NULL,
  endpoint TEXT NOT NULL,
  function_name TEXT NOT NULL,
  -- Main data
  request_body JSONB NOT NULL,
  ground_truth JSONB,
  is_golden BOOLEAN NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(function_name, hash)
);

CREATE TRIGGER update_data_points_updated_at BEFORE UPDATE ON data_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE data_points IS 'A table of data points. Each data point is a single request to an endpoint. It is used to store the data for the dataset.';

COMMENT ON COLUMN data_points.hash IS 'A hash of the request body. It is used to identify the data point, so we can reuse the same data point for multiple datasets.';

COMMENT ON COLUMN data_points.ground_truth IS 'The ground truth of the data point. Can be null if we generate the data point output on evaluation run. Can be auto-generated ahead of time by AI (Not golden). Can be manually verified by the user through the UI (golden).';

COMMENT ON COLUMN data_points.is_golden IS 'Whether the data point is golden. These are the data points that have been manually verified by the user.';

CREATE INDEX idx_data_points_hash ON data_points(hash);

CREATE INDEX idx_data_points_method ON data_points(method);

CREATE INDEX idx_data_points_endpoint ON data_points(endpoint);

CREATE INDEX idx_data_points_function_name ON data_points(function_name);

ALTER TABLE data_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON data_points FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- Dataset -> Data point bridge table
-- ================================================
CREATE TABLE if not exists dataset_data_point_bridge (
  dataset_id UUID NOT NULL,
  data_point_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (dataset_id, data_point_id),
  FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
  FOREIGN KEY (data_point_id) REFERENCES data_points(id) ON DELETE CASCADE
);

CREATE INDEX idx_dataset_data_point_bridge_dataset_id ON dataset_data_point_bridge(dataset_id);

CREATE INDEX idx_dataset_data_point_bridge_data_point_id ON dataset_data_point_bridge(data_point_id);

ALTER TABLE dataset_data_point_bridge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON dataset_data_point_bridge FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- Evaluation runs table
-- ================================================
CREATE TYPE evaluation_status AS ENUM ('running', 'pending', 'completed', 'failed');

CREATE TABLE if not exists evaluation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  evaluation_method TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status evaluation_status NOT NULL DEFAULT 'pending',
  results JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TRIGGER update_evaluation_runs_updated_at BEFORE UPDATE ON evaluation_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE evaluation_runs IS 'Stores final results of evaluation runs without per-point outputs or individual results';

COMMENT ON COLUMN evaluation_runs.evaluation_method IS 'The method used for evaluating the dataset';

COMMENT ON COLUMN evaluation_runs.status IS 'Status of the evaluation run';

COMMENT ON COLUMN evaluation_runs.results IS 'Final aggregated results of the evaluation run in JSON format';

COMMENT ON COLUMN evaluation_runs.metadata IS 'Additional metadata for the evaluation run configuration and settings';

CREATE INDEX idx_evaluation_runs_dataset_id ON evaluation_runs(dataset_id);

CREATE INDEX idx_evaluation_runs_agent_id ON evaluation_runs(agent_id);

CREATE INDEX idx_evaluation_runs_evaluation_method ON evaluation_runs(evaluation_method);

CREATE INDEX idx_evaluation_runs_status ON evaluation_runs(status);

CREATE INDEX idx_evaluation_runs_created_at ON evaluation_runs(created_at);

ALTER TABLE evaluation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON evaluation_runs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- Data point outputs table
-- ================================================
CREATE TABLE if not exists data_point_outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluation_run_id UUID NOT NULL,
  data_point_id UUID NOT NULL,
  output JSONB NOT NULL,
  score FLOAT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (evaluation_run_id) REFERENCES evaluation_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (data_point_id) REFERENCES data_points(id) ON DELETE CASCADE,
  UNIQUE(evaluation_run_id, data_point_id)
);

COMMENT ON TABLE data_point_outputs IS 'Stores individual data point outputs and scores for each evaluation run';

COMMENT ON COLUMN data_point_outputs.output IS 'The actual output generated for this data point during the evaluation run';

COMMENT ON COLUMN data_point_outputs.score IS 'Optional score for this specific data point output';

CREATE INDEX idx_data_point_outputs_evaluation_run_id ON data_point_outputs(evaluation_run_id);

CREATE INDEX idx_data_point_outputs_data_point_id ON data_point_outputs(data_point_id);

CREATE INDEX idx_data_point_outputs_score ON data_point_outputs(score);

ALTER TABLE data_point_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON data_point_outputs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- Cache table
-- ================================================
CREATE TABLE IF NOT EXISTS cache (
  key CHAR(64) PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON cache FOR ALL TO service_role USING (true) WITH CHECK (true);
