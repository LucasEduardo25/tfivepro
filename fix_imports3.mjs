import fs from 'fs';
const file = 'src/components/students/StudentProfileView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /TrendingDown, TrendingUp, Camera, Activity, Eye, Printer, Share2, Layers, Trash2, Scale, Plus, X/,
  'TrendingDown, TrendingUp, Camera, Activity, Eye, Printer, Share2, Layers, Trash2, Scale, Plus, X, Play, BookmarkPlus, Copy, Archive, Edit, RotateCcw, Dumbbell, Sparkles, FileText'
);

fs.writeFileSync(file, code);
console.log('Fixed lucide imports');
