import fs from 'fs';
const file = 'src/context/AppContext.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /import \{\s*getStudentRepository,/,
  "import { getTrainingMemoriesRepository, getStudentRepository,"
);

fs.writeFileSync(file, code);
