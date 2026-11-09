import fs from 'fs';
const file = 'src/components/students/StudentProfileView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/import \{.*?\} from '\.\.\/\.\.\/utils\/formatters';/g, '');
code = code.replace(/import \{ EvolutionPhotosGallery \} from '\.\/EvolutionPhotosGallery';/, "import { EvolutionPhotosGallery } from './EvolutionPhotosGallery';"); // Wait, it said "Cannot find module '../evolution/EvolutionPhotosGallery'".
code = code.replace(/import \{ EvolutionPhotosGallery \} from '\.\.\/evolution\/EvolutionPhotosGallery';/, "import { EvolutionPhotosGallery } from './EvolutionPhotosGallery';");

code = code.replace(/import \{ WorkoutStoryModal \} from '\.\.\/story\/WorkoutStoryModal';/, "import { WorkoutStoryModal } from '../story/WorkoutStoryModal';"); 
// wait, where are these files actually located?

fs.writeFileSync(file, code);
