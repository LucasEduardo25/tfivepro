-- ==============================================================================
-- 006: RELAX STUDENT GENDER CONSTRAINT
-- ==============================================================================
-- Permite que o campo gender em students seja nulo de forma explícita e segura
-- sem alterar retroativamente a migration 001_initial_schema.sql.

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_gender_check;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_constraint_2;

ALTER TABLE students ADD CONSTRAINT students_gender_check 
    CHECK (gender IS NULL OR gender IN ('male', 'female', 'other'));
