const fs = require('fs');
const content = fs.readFileSync('./src/context/AppContext.tsx', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('putInStore(') || line.includes('putInStore (')) {
    console.log(`\n--- Line ${i + 1}: ${line.trim()} ---`);
    let start = Math.max(0, i - 15);
    let end = Math.min(lines.length - 1, i + 15);
    for (let j = start; j <= end; j++) {
      console.log(`${j + 1}: ${lines[j]}`);
    }
  }
});
