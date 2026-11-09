-- Adicionar coluna modality em students
ALTER TABLE students ADD COLUMN IF NOT EXISTS modality TEXT DEFAULT 'IN_PERSON';

-- Atualizar RLS para permitir que alunos ONLINE_COACHING insiram e atualizem sessions e session_sets
-- SESSIONS
CREATE POLICY "Students can insert own sessions if online coaching"
  ON sessions FOR INSERT
  WITH CHECK (
    is_authorized_student(organization_id, student_id)
    AND EXISTS (
      SELECT 1 FROM students s WHERE s.id = student_id AND s.modality = 'ONLINE_COACHING'
    )
  );

CREATE POLICY "Students can update own sessions if online coaching"
  ON sessions FOR UPDATE
  USING (
    is_authorized_student(organization_id, student_id)
    AND EXISTS (
      SELECT 1 FROM students s WHERE s.id = student_id AND s.modality = 'ONLINE_COACHING'
    )
  )
  WITH CHECK (
    is_authorized_student(organization_id, student_id)
    AND EXISTS (
      SELECT 1 FROM students s WHERE s.id = student_id AND s.modality = 'ONLINE_COACHING'
    )
  );

-- SESSION SETS
CREATE POLICY "Students can insert own session sets if online coaching"
  ON session_sets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s 
      WHERE s.id = session_sets.session_id 
      AND is_authorized_student(s.organization_id, s.student_id)
      AND EXISTS (
        SELECT 1 FROM students st WHERE st.id = s.student_id AND st.modality = 'ONLINE_COACHING'
      )
    )
  );

CREATE POLICY "Students can update own session sets if online coaching"
  ON session_sets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sessions s 
      WHERE s.id = session_sets.session_id 
      AND is_authorized_student(s.organization_id, s.student_id)
      AND EXISTS (
        SELECT 1 FROM students st WHERE st.id = s.student_id AND st.modality = 'ONLINE_COACHING'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s 
      WHERE s.id = session_sets.session_id 
      AND is_authorized_student(s.organization_id, s.student_id)
      AND EXISTS (
        SELECT 1 FROM students st WHERE st.id = s.student_id AND st.modality = 'ONLINE_COACHING'
      )
    )
  );

-- ACTIVE WORKOUTS
CREATE POLICY "Students can manage own active workouts if online coaching"
  ON active_workouts FOR ALL
  USING (
    is_authorized_student(organization_id, student_id)
    AND EXISTS (
      SELECT 1 FROM students s WHERE s.id = student_id AND s.modality = 'ONLINE_COACHING'
    )
  )
  WITH CHECK (
    is_authorized_student(organization_id, student_id)
    AND EXISTS (
      SELECT 1 FROM students s WHERE s.id = student_id AND s.modality = 'ONLINE_COACHING'
    )
  );
