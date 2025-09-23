-- ================================================
-- pgvector extension and skill configuration embeddings
-- ================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ================================================
-- Skill configuration embeddings table
-- ================================================
CREATE TABLE IF NOT EXISTS skill_configuration_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_configuration_id UUID NOT NULL,
  embedding vector(1536) NOT NULL, -- Default dimensions for text-embedding-3-small
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (skill_configuration_id) REFERENCES skill_configurations(id) ON DELETE CASCADE,
  UNIQUE(skill_configuration_id) -- One embedding per skill configuration
);

-- Add trigger for updated_at
CREATE TRIGGER update_skill_configuration_embeddings_updated_at BEFORE UPDATE ON skill_configuration_embeddings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    

-- Add comments for documentation
COMMENT ON TABLE skill_configuration_embeddings IS 'Stores the center of a the cluster for which a skill configuration is configuring';

COMMENT ON COLUMN skill_configuration_embeddings.embedding IS 'The center of the cluster';

-- Create indexes for vector similarity search
-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX idx_skill_configuration_embeddings_embedding_l2 ON skill_configuration_embeddings
  USING hnsw (embedding vector_l2_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_skill_configuration_embeddings_embedding_cosine ON skill_configuration_embeddings
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_skill_configuration_embeddings_embedding_inner_product ON skill_configuration_embeddings
  USING hnsw (embedding vector_ip_ops) WITH (m = 16, ef_construction = 64);

-- Regular indexes
CREATE INDEX idx_skill_configuration_embeddings_skill_configuration_id ON skill_configuration_embeddings(skill_configuration_id);

-- Enable Row Level Security
ALTER TABLE skill_configuration_embeddings ENABLE ROW LEVEL SECURITY;

-- Policy: Only service_role can access configuration embeddings
CREATE POLICY "service_role_full_access" ON skill_configuration_embeddings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- PostgREST-compatible functions for vector operations
-- ================================================

-- Function: Search for similar skill configurations using k-nearest neighbor
CREATE OR REPLACE FUNCTION search_similar_skill_configurations(
  query_embedding vector(1536),
  similarity_limit integer DEFAULT 10,
  distance_metric text DEFAULT 'cosine'
)
RETURNS TABLE (
  id uuid,
  skill_configuration_id uuid,
  similarity_score float,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate distance metric
  IF distance_metric NOT IN ('cosine', 'l2', 'inner_product') THEN
    RAISE EXCEPTION 'Invalid distance metric. Must be one of: cosine, l2, inner_product';
  END IF;

  -- Validate limit
  IF similarity_limit <= 0 OR similarity_limit > 1000 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 1000';
  END IF;

  -- Return results based on distance metric
  IF distance_metric = 'cosine' THEN
    RETURN QUERY
    SELECT
      le.id,
      le.skill_configuration_id,
      (1 - (le.embedding <=> query_embedding)) as similarity_score,
      le.created_at
    FROM skill_configuration_embeddings le
    ORDER BY le.embedding <=> query_embedding
    LIMIT similarity_limit;
  ELSIF distance_metric = 'l2' THEN
    RETURN QUERY
    SELECT
      le.id,
      le.skill_configuration_id,
      (1.0 / (1.0 + (le.embedding <-> query_embedding))) as similarity_score,
      le.created_at
    FROM skill_configuration_embeddings le
    ORDER BY le.embedding <-> query_embedding
    LIMIT similarity_limit;
  ELSE -- inner_product
    RETURN QUERY
    SELECT
      le.id,
      le.skill_configuration_id,
      (le.embedding <#> query_embedding) * -1 as similarity_score,
      le.created_at
    FROM skill_configuration_embeddings le
    ORDER BY le.embedding <#> query_embedding
    LIMIT similarity_limit;
  END IF;
END;
$$;

-- Function: Search skill configurations within a similarity threshold
CREATE OR REPLACE FUNCTION search_skill_configurations_by_threshold(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.8,
  distance_metric text DEFAULT 'cosine',
  max_results integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  skill_configuration_id uuid,
  similarity_score float,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate inputs
  IF distance_metric NOT IN ('cosine', 'l2', 'inner_product') THEN
    RAISE EXCEPTION 'Invalid distance metric. Must be one of: cosine, l2, inner_product';
  END IF;

  IF similarity_threshold < 0 OR similarity_threshold > 1 THEN
    RAISE EXCEPTION 'Similarity threshold must be between 0 and 1';
  END IF;

  IF max_results <= 0 OR max_results > 1000 THEN
    RAISE EXCEPTION 'Max results must be between 1 and 1000';
  END IF;

  -- Return results based on distance metric
  IF distance_metric = 'cosine' THEN
    RETURN QUERY
    SELECT
      le.id,
      le.skill_configuration_id,
      (1 - (le.embedding <=> query_embedding)) as similarity_score,
      le.created_at
    FROM skill_configuration_embeddings le
    WHERE (1 - (le.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY le.embedding <=> query_embedding
    LIMIT max_results;
  ELSIF distance_metric = 'l2' THEN
    -- For L2 distance, we need to convert the threshold appropriately
    RETURN QUERY
    SELECT
      le.id,
      le.skill_configuration_id,
      (1.0 / (1.0 + (le.embedding <-> query_embedding))) as similarity_score,
      le.created_at
    FROM skill_configuration_embeddings le
    WHERE (1.0 / (1.0 + (le.embedding <-> query_embedding))) >= similarity_threshold
    ORDER BY le.embedding <-> query_embedding
    LIMIT max_results;
  ELSE -- inner_product
    RETURN QUERY
    SELECT
      le.id,
      le.skill_configuration_id,
      (le.embedding <#> query_embedding) * -1 as similarity_score,
      le.created_at
    FROM skill_configuration_embeddings le
    WHERE (le.embedding <#> query_embedding) * -1 >= similarity_threshold
    ORDER BY le.embedding <#> query_embedding
    LIMIT max_results;
  END IF;
END;
$$;

COMMENT ON FUNCTION search_similar_skill_configurations IS 'Find skill configurations with similar embeddings using k-nearest neighbor search';
COMMENT ON FUNCTION search_skill_configurations_by_threshold IS 'Find skill configurations with embeddings above a similarity threshold';
