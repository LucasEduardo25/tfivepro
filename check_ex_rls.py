import re
with open('supabase/migrations/002_rls.sql', 'r') as f:
    content = f.read()

match = re.search(r'CREATE POLICY "Students can view exercises".*?;', content, re.DOTALL)
if match:
    print(match.group(0))
