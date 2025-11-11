-- ================================================
-- Atomic operations for skill optimization
-- ================================================
-- NOTE: This migration must run AFTER 20251110033000_move_metadata_to_columns.sql

-- Atomically increment cluster total_steps by 1
-- Returns the updated cluster
CREATE OR REPLACE FUNCTION increment_cluster_total_steps(
  p_cluster_id UUID
)
RETURNS SETOF skill_optimization_clusters AS $$
BEGIN
  RETURN QUERY
  UPDATE skill_optimization_clusters
  SET total_steps = total_steps + 1
  WHERE id = p_cluster_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Atomically try to acquire skill evaluation regeneration lock
-- Returns the skill if lock was acquired, NULL if already locked or completed
CREATE OR REPLACE FUNCTION try_acquire_evaluation_lock(
  p_skill_id UUID,
  p_lock_timeout_seconds INTEGER DEFAULT 300
)
RETURNS SETOF skills AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_lock_cutoff TIMESTAMPTZ := v_now - (p_lock_timeout_seconds || ' seconds')::INTERVAL;
BEGIN
  RETURN QUERY
  UPDATE skills
  SET evaluation_lock_acquired_at = v_now
  WHERE id = p_skill_id
    -- Not already completed
    AND evaluations_regenerated_at IS NULL
    -- No lock exists, or lock is stale
    AND (
      evaluation_lock_acquired_at IS NULL
      OR evaluation_lock_acquired_at < v_lock_cutoff
    )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Atomically try to acquire skill reflection lock
-- Returns the skill if lock was acquired, NULL if already locked
CREATE OR REPLACE FUNCTION try_acquire_reflection_lock(
  p_skill_id UUID,
  p_lock_timeout_seconds INTEGER DEFAULT 600
)
RETURNS SETOF skills AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_lock_cutoff TIMESTAMPTZ := v_now - (p_lock_timeout_seconds || ' seconds')::INTERVAL;
BEGIN
  RETURN QUERY
  UPDATE skills
  SET reflection_lock_acquired_at = v_now
  WHERE id = p_skill_id
    -- No lock exists, or lock is stale
    AND (
      reflection_lock_acquired_at IS NULL
      OR reflection_lock_acquired_at < v_lock_cutoff
    )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Release evaluation regeneration lock
CREATE OR REPLACE FUNCTION release_evaluation_lock(
  p_skill_id UUID
)
RETURNS SETOF skills AS $$
BEGIN
  RETURN QUERY
  UPDATE skills
  SET evaluation_lock_acquired_at = NULL
  WHERE id = p_skill_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Release reflection lock
CREATE OR REPLACE FUNCTION release_reflection_lock(
  p_skill_id UUID
)
RETURNS SETOF skills AS $$
BEGIN
  RETURN QUERY
  UPDATE skills
  SET reflection_lock_acquired_at = NULL
  WHERE id = p_skill_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Complete evaluation regeneration (mark complete and release lock atomically)
CREATE OR REPLACE FUNCTION complete_evaluation_regeneration(
  p_skill_id UUID
)
RETURNS SETOF skills AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
BEGIN
  RETURN QUERY
  UPDATE skills
  SET
    evaluations_regenerated_at = v_now,
    evaluation_lock_acquired_at = NULL
  WHERE id = p_skill_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Reset all cluster total_steps for a skill atomically
-- Useful after soft reset when regenerating evaluations
CREATE OR REPLACE FUNCTION reset_skill_cluster_steps(
  p_skill_id UUID
)
RETURNS TABLE(cluster_id UUID, old_steps INTEGER, new_steps INTEGER) AS $$
BEGIN
  RETURN QUERY
  UPDATE skill_optimization_clusters
  SET total_steps = 0
  WHERE skill_id = p_skill_id
  RETURNING id, total_steps, 0;
END;
$$ LANGUAGE plpgsql;
