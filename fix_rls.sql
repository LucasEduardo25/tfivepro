CREATE OR REPLACE FUNCTION is_authorized_student(org_id UUID, p_student_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM student_access sa
    WHERE sa.student_id = p_student_id
      AND sa.organization_id = org_id
      AND sa.user_id = auth.uid()
      AND sa.enabled = true
      AND sa.status = 'ACTIVE'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
