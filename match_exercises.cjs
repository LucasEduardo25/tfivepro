const fs = require('fs');
const content = fs.readFileSync('src/data/exerciseBank.ts', 'utf8');
const match = content.match(/export const INITIAL_EXERCISES: Exercise\[\] = \(\[([\s\S]+?)\]\)/);
if (!match) {
  console.log("Could not parse exerciseBank.ts");
  process.exit(1);
}
let exercisesStr = match[1];
// The file is a TS file containing an array of objects.
// Since it is valid JS/JSON-like, we can try to evaluate it, or just use regex.
const jsonStr = '[' + exercisesStr + ']';
const exercises = eval(jsonStr); // eval is safe here since we control the file

const requestedNames = [
  "Supino Reto com Barra", "Supino Inclinado com Barra", "Supino Declinado com Barra",
  "Supino Reto com Halteres", "Supino Inclinado com Halteres",
  "Supino Máquina", "Supino Inclinado Máquina",
  "Crucifixo com Halteres", "Crucifixo Inclinado com Halteres",
  "Peck Deck", "Voador",
  "Crossover na Polia Alta", "Crossover na Polia Média", "Crossover na Polia Baixa",
  "Flexão de Braços",
  "Puxada Frontal Pegada Aberta", "Puxada Frontal Pegada Neutra", "Puxada Frontal Pegada Supinada",
  "Barra Fixa",
  "Remada Baixa na Polia", "Remada Baixa Pegada Neutra",
  "Remada Curvada com Barra", "Remada Unilateral com Halter", "Remada Cavalinho", "Remada Máquina",
  "Pulldown com Braços Estendidos",
  "Desenvolvimento com Halteres", "Desenvolvimento com Barra", "Desenvolvimento Máquina",
  "Elevação Lateral com Halteres", "Elevação Lateral na Polia", "Elevação Lateral Máquina",
  "Elevação Frontal com Halteres", "Elevação Frontal na Polia",
  "Crucifixo Inverso", "Crucifixo Inverso Máquina",
  "Face Pull",
  "Rosca Direta com Barra", "Rosca Direta na Polia",
  "Rosca Alternada com Halteres",
  "Rosca Martelo", "Rosca Martelo na Polia com Corda",
  "Rosca Scott com Barra", "Rosca Scott Máquina",
  "Rosca Concentrada",
  "Rosca Inclinada com Halteres",
  "Tríceps Pulley com Barra", "Tríceps Pulley com Corda",
  "Tríceps Francês com Halter", "Tríceps Francês na Polia",
  "Tríceps Testa com Barra", "Tríceps Testa com Halteres",
  "Tríceps Coice",
  "Mergulho nas Paralelas", "Mergulho no Banco",
  "Agachamento Livre", "Agachamento Frontal", "Agachamento no Smith",
  "Hack Squat", "Leg Press 45°", "Leg Press Horizontal", "Cadeira Extensora",
  "Agachamento Goblet", "Afundo", "Afundo com Halteres", "Afundo no Smith",
  "Passada com Halteres", "Agachamento Búlgaro",
  "Mesa Flexora", "Cadeira Flexora", "Flexora em Pé",
  "Stiff com Barra", "Stiff com Halteres", "Levantamento Terra Romeno", "Good Morning",
  "Elevação Pélvica com Barra", "Elevação Pélvica Máquina",
  "Glúteo na Polia", "Glúteo Máquina",
  "Cadeira Abdutora", "Abdução de Quadril na Polia", "Step-Up",
  "Cadeira Adutora", "Adução de Quadril na Polia",
  "Panturrilha em Pé", "Panturrilha em Pé Máquina", "Panturrilha Sentado",
  "Panturrilha no Leg Press", "Panturrilha no Smith",
  "Abdominal Supra", "Abdominal Infra", "Abdominal Máquina", "Abdominal na Polia",
  "Prancha Frontal", "Prancha Lateral", "Elevação de Pernas", "Elevação de Joelhos",
  "Abdominal Bicicleta", "Dead Bug", "Bird Dog",
  "Levantamento Terra", "Levantamento Terra com Trap Bar", "Farmer's Walk",
  "Esteira — Caminhada", "Esteira — Corrida", "Bicicleta Ergométrica",
  "Bicicleta Spinning", "Elíptico", "Escada / Stair Climber", "Remo Ergométrico"
];

const mapped = [];

for (const req of requestedNames) {
  // Find best match by exact name or lowercase
  let match = exercises.find(e => e.name.toLowerCase() === req.toLowerCase());
  if (!match) {
    // Try partial
    match = exercises.find(e => e.name.toLowerCase().includes(req.toLowerCase()));
  }
  if (match) {
    mapped.push({ req, id: match.id, actualName: match.name });
  } else {
    mapped.push({ req, id: null });
  }
}

console.log(JSON.stringify(mapped, null, 2));

