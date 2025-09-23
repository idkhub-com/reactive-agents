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
  max_configurations INTEGER NOT NULL DEFAULT 10,
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
  embedding FLOAT[] DEFAULT NULL,
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
  is_realtime BOOLEAN NOT NULL DEFAULT FALSE,
  realtime_size INTEGER NOT NULL DEFAULT 1,
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

CREATE INDEX idx_datasets_is_realtime ON datasets(is_realtime);

COMMENT ON COLUMN datasets.is_realtime IS 'Whether the dataset is realtime or not. Realtime datasets do not use bridge tables to decide which logs are part of the dataset. Instead, they use a dedicated buffer (e.g. Last 100 logs of the skill).';

COMMENT ON COLUMN datasets.realtime_size IS 'Only used when is_realtime is true. The maximum number of logs to keep in the realtime buffer';

ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON datasets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- Dataset -> Log bridge table
-- ================================================
CREATE TABLE if not exists dataset_log_bridge (
  dataset_id UUID NOT NULL,
  log_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (dataset_id, log_id),
  FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
  FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE
);

CREATE INDEX idx_dataset_log_bridge_dataset_id ON dataset_log_bridge(dataset_id);

CREATE INDEX idx_dataset_log_bridge_log_id ON dataset_log_bridge(log_id);

ALTER TABLE dataset_log_bridge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON dataset_log_bridge FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- Evaluation runs table
-- ================================================
CREATE TYPE evaluation_status AS ENUM ('running', 'pending', 'completed', 'failed');

CREATE TABLE if not exists evaluation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  skill_id UUID NOT NULL,
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
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (skill_id) REFERENCES skills(id)
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
-- Log outputs table
-- ================================================
CREATE TABLE if not exists log_outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluation_run_id UUID NOT NULL,
  log_id UUID NOT NULL,
  output JSONB NOT NULL,
  score FLOAT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (evaluation_run_id) REFERENCES evaluation_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE,
  UNIQUE(evaluation_run_id, log_id)
);

COMMENT ON TABLE log_outputs IS 'Stores individual log outputs and scores for each evaluation run';

COMMENT ON COLUMN log_outputs.output IS 'The actual output generated for this log during the evaluation run';

COMMENT ON COLUMN log_outputs.score IS 'Optional score for this specific log output';

CREATE INDEX idx_log_outputs_evaluation_run_id ON log_outputs(evaluation_run_id);

CREATE INDEX idx_log_outputs_log_id ON log_outputs(log_id);

CREATE INDEX idx_log_outputs_score ON log_outputs(score);

ALTER TABLE log_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON log_outputs FOR ALL TO service_role USING (true) WITH CHECK (true);

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

-- ================================================
-- Skill configurations table
-- ================================================
CREATE TABLE IF NOT EXISTS skill_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL,
  skill_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  UNIQUE(agent_id, skill_id, name)
);

CREATE TRIGGER update_skill_configurations_updated_at BEFORE UPDATE ON skill_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_skill_configurations_agent_id ON skill_configurations(agent_id);

CREATE INDEX idx_skill_configurations_skill_id ON skill_configurations(skill_id);

CREATE INDEX idx_skill_configurations_name ON skill_configurations(name);

ALTER TABLE skill_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON skill_configurations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- AI Provider API Keys
-- ================================================
CREATE TABLE IF NOT EXISTS ai_provider_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ai_provider TEXT NOT NULL,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ai_provider, name)
);

CREATE TRIGGER ai_provider_api_keys_updated_at BEFORE UPDATE ON ai_provider_api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_ai_provider_api_keys_ai_provider ON ai_provider_api_keys(ai_provider);

CREATE INDEX idx_ai_provider_api_keys_name ON ai_provider_api_keys(name);

ALTER TABLE ai_provider_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON ai_provider_api_keys FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- Models table
-- ================================================
CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ai_provider_api_key_id UUID NOT NULL,
  model_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ai_provider_api_key_id) REFERENCES ai_provider_api_keys(id) ON DELETE CASCADE,
  UNIQUE(ai_provider_api_key_id, model_name)
);

CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_models_ai_provider_api_key_id ON models(ai_provider_api_key_id);
CREATE INDEX idx_models_model_name ON models(model_name);

ALTER TABLE models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON models FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- Skill Models bridge table
-- ================================================
CREATE TABLE IF NOT EXISTS skill_models (
  skill_id UUID NOT NULL,
  model_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (skill_id, model_id),
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
);

CREATE INDEX idx_skill_models_skill_id ON skill_models(skill_id);
CREATE INDEX idx_skill_models_model_id ON skill_models(model_id);

ALTER TABLE skill_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON skill_models FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE models IS 'AI models tied to specific API keys';
COMMENT ON COLUMN models.ai_provider_api_key_id IS 'The API key that enables access to this model';
COMMENT ON COLUMN models.model_name IS 'The name of the AI model (e.g., gpt-4, claude-3-opus)';
COMMENT ON TABLE skill_models IS 'Bridge table linking skills to the models they can use';
COMMENT ON COLUMN skills.max_configurations IS 'Maximum number of configurations allowed for this skill';
