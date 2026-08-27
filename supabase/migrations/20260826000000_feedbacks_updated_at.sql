-- ================================================
-- Add the missing feedbacks.updated_at column
-- ================================================
-- `Feedback` in @shared/types/data/feedback is `.strict()` and requires
-- `updated_at`, and `FeedbackCreateParams` generates one on every create. The
-- table never had the column, so PostgREST rejected the insert with PGRST204
-- and any row that did exist failed to parse on read. Every test mocks the
-- connector, so neither showed up in CI.
--
-- The column is added rather than removed from the schemas because the rest of
-- the tables that carry `created_at` also carry `updated_at`, and the type has
-- always advertised it.

ALTER TABLE feedbacks
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TRIGGER update_feedbacks_updated_at BEFORE UPDATE ON feedbacks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN feedbacks.updated_at IS 'Timestamp of the last update to this feedback row';
