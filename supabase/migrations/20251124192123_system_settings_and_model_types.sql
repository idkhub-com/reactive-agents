-- Migration: System settings, model types, and related schema changes
-- This consolidated migration includes:
-- 1. system_settings table for configuring internal operation models
-- 2. model_type enum and columns on models table
-- 3. Validation functions for model types in system_settings
-- 4. model_id column on skill_optimization_evaluations
-- 5. developer_mode setting
-- 6. embedding_model_id on skill_optimization_clusters

-- ============================================================================
-- PART 1: Create system_settings table (singleton - only one row allowed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  -- Model settings for internal operations
  -- ON DELETE RESTRICT prevents deleting models that are in use by settings
  system_prompt_reflection_model_id UUID REFERENCES models(id) ON DELETE RESTRICT,
  evaluation_generation_model_id UUID REFERENCES models(id) ON DELETE RESTRICT,
  embedding_model_id UUID REFERENCES models(id) ON DELETE RESTRICT,
  judge_model_id UUID REFERENCES models(id) ON DELETE RESTRICT,
  -- Developer mode: when enabled, shows the reactive-agents internal agent and its skills
  developer_mode BOOLEAN NOT NULL DEFAULT FALSE,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add updated_at trigger
CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ensure only one row can exist (singleton pattern)
CREATE UNIQUE INDEX system_settings_singleton ON system_settings ((true));

-- Insert default row with NULL values (will use env var fallback until configured)
INSERT INTO system_settings (id) VALUES (extensions.uuid_generate_v4());

-- Add RLS policies
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on system_settings"
  ON system_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PART 2: Add model_type and embedding_dimensions columns to models table
-- ============================================================================

-- Create enum type for model types
CREATE TYPE model_type AS ENUM ('text', 'embed');

-- Add model_type column with default 'text'
ALTER TABLE models
ADD COLUMN model_type model_type NOT NULL DEFAULT 'text';

-- Add embedding_dimensions column (only relevant for embed models)
ALTER TABLE models
ADD COLUMN embedding_dimensions INTEGER NULL;

-- Add check constraint: embedding_dimensions should only be set for embed models
ALTER TABLE models
ADD CONSTRAINT embedding_dimensions_only_for_embed
CHECK (
  (model_type = 'embed' AND embedding_dimensions IS NOT NULL) OR
  (model_type = 'text' AND embedding_dimensions IS NULL)
);

-- ============================================================================
-- PART 3: Validation functions for model types
-- ============================================================================

-- Create a function to validate model type
CREATE OR REPLACE FUNCTION check_model_type(model_id UUID, expected_type model_type)
RETURNS BOOLEAN AS $$
DECLARE
  actual_type model_type;
BEGIN
  IF model_id IS NULL THEN
    RETURN TRUE;
  END IF;

  SELECT model_type INTO actual_type FROM models WHERE id = model_id;

  IF actual_type IS NULL THEN
    RETURN FALSE; -- Model doesn't exist
  END IF;

  RETURN actual_type = expected_type;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create trigger function to validate system_settings model types
CREATE OR REPLACE FUNCTION validate_system_settings_model_types()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate embedding_model_id must be an embed model
  IF NOT check_model_type(NEW.embedding_model_id, 'embed') THEN
    RAISE EXCEPTION 'embedding_model_id must reference an embed model';
  END IF;

  -- Validate system_prompt_reflection_model_id must be a text model
  IF NOT check_model_type(NEW.system_prompt_reflection_model_id, 'text') THEN
    RAISE EXCEPTION 'system_prompt_reflection_model_id must reference a text model';
  END IF;

  -- Validate evaluation_generation_model_id must be a text model
  IF NOT check_model_type(NEW.evaluation_generation_model_id, 'text') THEN
    RAISE EXCEPTION 'evaluation_generation_model_id must reference a text model';
  END IF;

  -- Validate judge_model_id must be a text model
  IF NOT check_model_type(NEW.judge_model_id, 'text') THEN
    RAISE EXCEPTION 'judge_model_id must reference a text model';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on system_settings
CREATE TRIGGER system_settings_model_type_validation
  BEFORE INSERT OR UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION validate_system_settings_model_types();

-- Also prevent changing a model's type if it's referenced in system_settings
CREATE OR REPLACE FUNCTION prevent_model_type_change_if_referenced()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if model_type is being changed
  IF OLD.model_type = NEW.model_type THEN
    RETURN NEW;
  END IF;

  -- Check if this model is referenced in system_settings
  IF EXISTS (
    SELECT 1 FROM system_settings
    WHERE embedding_model_id = NEW.id
       OR system_prompt_reflection_model_id = NEW.id
       OR evaluation_generation_model_id = NEW.id
       OR judge_model_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Cannot change model_type for a model that is referenced in system_settings';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on models
CREATE TRIGGER models_prevent_type_change_if_referenced
  BEFORE UPDATE ON models
  FOR EACH ROW
  EXECUTE FUNCTION prevent_model_type_change_if_referenced();

-- ============================================================================
-- PART 4: Add model_id to skill_optimization_evaluations table
-- ============================================================================

-- Add model_id column (nullable for backwards compatibility, but should be set for new evaluations)
-- CASCADE delete: if the model is deleted, evaluations using it are also deleted
ALTER TABLE skill_optimization_evaluations
ADD COLUMN model_id UUID REFERENCES models(id) ON DELETE CASCADE;

-- Create index for model_id
CREATE INDEX idx_skill_optimization_evaluations_model_id ON skill_optimization_evaluations(model_id);

-- Create trigger function to validate model type is 'text' for evaluations
CREATE OR REPLACE FUNCTION validate_evaluation_model_type()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow NULL model_id
  IF NEW.model_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Validate model_id must be a text model
  IF NOT check_model_type(NEW.model_id, 'text') THEN
    RAISE EXCEPTION 'evaluation model_id must reference a text model';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on skill_optimization_evaluations
CREATE TRIGGER skill_optimization_evaluations_model_type_validation
  BEFORE INSERT OR UPDATE ON skill_optimization_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION validate_evaluation_model_type();

COMMENT ON COLUMN skill_optimization_evaluations.model_id IS 'The model used to run this evaluation. Must be a text model.';

-- ============================================================================
-- PART 5: Add embedding_model_id to skill_optimization_clusters
-- ============================================================================

-- Each cluster stores a reference to the embedding model used for its centroids
-- This allows clusters to have different embedding dimensions
ALTER TABLE skill_optimization_clusters
ADD COLUMN IF NOT EXISTS embedding_model_id UUID REFERENCES models(id) ON DELETE CASCADE;

-- Add index for the foreign key
CREATE INDEX IF NOT EXISTS idx_skill_optimization_clusters_embedding_model_id
ON skill_optimization_clusters(embedding_model_id);

COMMENT ON COLUMN skill_optimization_clusters.embedding_model_id IS 'The embedding model used for computing centroids in this cluster';
