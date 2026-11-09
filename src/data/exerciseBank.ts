import { Exercise } from '../types';

/**
 * Biblioteca Essencial TFIVE PRO.
 * Exercícios fundamentais de academias convencionais, 
 * cobrindo os principais grupos musculares e cardiovasculares.
 */
export const INITIAL_EXERCISES: Exercise[] = [
  // PEITO (11)
  { id: 'tfive-chest-001', name: 'Supino Reto com Barra', muscleGroup: 'Peitoral', equipment: 'Barra', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-chest-002', name: 'Supino Inclinado com Barra', muscleGroup: 'Peitoral', equipment: 'Barra', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-chest-003', name: 'Supino Declinado com Barra', muscleGroup: 'Peitoral', equipment: 'Barra', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-chest-004', name: 'Supino Reto com Halteres', muscleGroup: 'Peitoral', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-chest-005', name: 'Supino Inclinado com Halteres', muscleGroup: 'Peitoral', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-chest-006', name: 'Supino Máquina', muscleGroup: 'Peitoral', equipment: 'Máquina', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-chest-007', name: 'Supino Inclinado Máquina', muscleGroup: 'Peitoral', equipment: 'Máquina', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-chest-008', name: 'Crucifixo com Halteres', muscleGroup: 'Peitoral', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-chest-009', name: 'Crucifixo Inclinado com Halteres', muscleGroup: 'Peitoral', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-chest-010', name: 'Peck Deck / Voador', muscleGroup: 'Peitoral', equipment: 'Máquina', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-chest-011', name: 'Crossover na Polia Alta', muscleGroup: 'Peitoral', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-chest-012', name: 'Crossover na Polia Média', muscleGroup: 'Peitoral', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-chest-013', name: 'Crossover na Polia Baixa', muscleGroup: 'Peitoral', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-chest-014', name: 'Flexão de Braços', muscleGroup: 'Peitoral', equipment: 'Peso Corporal', recordType: 'bodyweight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },

  // COSTAS (9)
  { id: 'tfive-back-001', name: 'Puxada Frontal Pegada Aberta', muscleGroup: 'Costas', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-back-002', name: 'Puxada Frontal Pegada Neutra', muscleGroup: 'Costas', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-back-003', name: 'Puxada Frontal Pegada Supinada', muscleGroup: 'Costas', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-back-004', name: 'Barra Fixa', muscleGroup: 'Costas', equipment: 'Peso Corporal', recordType: 'bodyweight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-back-005', name: 'Remada Baixa na Polia', muscleGroup: 'Costas', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-back-006', name: 'Remada Baixa Pegada Neutra', muscleGroup: 'Costas', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-back-007', name: 'Remada Curvada com Barra', muscleGroup: 'Costas', equipment: 'Barra', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-back-008', name: 'Remada Unilateral com Halter', muscleGroup: 'Costas', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-back-009', name: 'Remada Cavalinho', muscleGroup: 'Costas', equipment: 'Barra', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-back-010', name: 'Remada Máquina', muscleGroup: 'Costas', equipment: 'Máquina', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-back-011', name: 'Pulldown com Braços Estendidos', muscleGroup: 'Costas', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },

  // OMBROS (9)
  { id: 'tfive-shoulder-001', name: 'Desenvolvimento com Halteres', muscleGroup: 'Ombros', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-shoulder-002', name: 'Desenvolvimento com Barra', muscleGroup: 'Ombros', equipment: 'Barra', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-shoulder-003', name: 'Desenvolvimento Máquina', muscleGroup: 'Ombros', equipment: 'Máquina', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-shoulder-004', name: 'Elevação Lateral com Halteres', muscleGroup: 'Ombros', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-shoulder-005', name: 'Elevação Lateral na Polia', muscleGroup: 'Ombros', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-shoulder-006', name: 'Elevação Lateral Máquina', muscleGroup: 'Ombros', equipment: 'Máquina', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-shoulder-007', name: 'Elevação Frontal com Halteres', muscleGroup: 'Ombros', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-shoulder-008', name: 'Elevação Frontal na Polia', muscleGroup: 'Ombros', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-shoulder-009', name: 'Crucifixo Inverso', muscleGroup: 'Ombros', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-shoulder-010', name: 'Crucifixo Inverso Máquina', muscleGroup: 'Ombros', equipment: 'Máquina', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-shoulder-011', name: 'Face Pull', muscleGroup: 'Ombros', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },

  // BÍCEPS (7)
  { id: 'tfive-biceps-001', name: 'Rosca Direta com Barra', muscleGroup: 'Bíceps', equipment: 'Barra', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-biceps-002', name: 'Rosca Direta na Polia', muscleGroup: 'Bíceps', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-biceps-003', name: 'Rosca Alternada com Halteres', muscleGroup: 'Bíceps', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-biceps-004', name: 'Rosca Martelo', muscleGroup: 'Bíceps', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-biceps-005', name: 'Rosca Martelo na Polia com Corda', muscleGroup: 'Bíceps', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-biceps-006', name: 'Rosca Scott com Barra', muscleGroup: 'Bíceps', equipment: 'Barra', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-biceps-007', name: 'Rosca Scott Máquina', muscleGroup: 'Bíceps', equipment: 'Máquina', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-biceps-008', name: 'Rosca Concentrada', muscleGroup: 'Bíceps', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-biceps-009', name: 'Rosca Inclinada com Halteres', muscleGroup: 'Bíceps', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },

  // TRÍCEPS (7)
  { id: 'tfive-triceps-001', name: 'Tríceps Pulley com Barra', muscleGroup: 'Tríceps', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-triceps-002', name: 'Tríceps Pulley com Corda', muscleGroup: 'Tríceps', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-triceps-003', name: 'Tríceps Francês com Halter', muscleGroup: 'Tríceps', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-triceps-004', name: 'Tríceps Francês na Polia', muscleGroup: 'Tríceps', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-triceps-005', name: 'Tríceps Testa com Barra', muscleGroup: 'Tríceps', equipment: 'Barra', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-triceps-006', name: 'Tríceps Testa com Halteres', muscleGroup: 'Tríceps', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-triceps-007', name: 'Tríceps Coice', muscleGroup: 'Tríceps', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-triceps-008', name: 'Mergulho nas Paralelas', muscleGroup: 'Tríceps', equipment: 'Peso Corporal', recordType: 'bodyweight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-triceps-009', name: 'Mergulho no Banco', muscleGroup: 'Tríceps', equipment: 'Banco', recordType: 'bodyweight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },

  // QUADRÍCEPS (11)
  { id: 'tfive-quads-001', name: 'Agachamento Livre', muscleGroup: 'Quadríceps', equipment: 'Barra', recordType: 'weight_reps', defaultRestSeconds: 120, executionSteps: [], isArchived: false },
  { id: 'tfive-quads-002', name: 'Agachamento Frontal', muscleGroup: 'Quadríceps', equipment: 'Barra', recordType: 'weight_reps', defaultRestSeconds: 120, executionSteps: [], isArchived: false },
  { id: 'tfive-quads-003', name: 'Agachamento no Smith', muscleGroup: 'Quadríceps', equipment: 'Smith', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-quads-004', name: 'Hack Squat', muscleGroup: 'Quadríceps', equipment: 'Hack', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-quads-005', name: 'Leg Press 45°', muscleGroup: 'Quadríceps', equipment: 'Leg Press', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-quads-006', name: 'Leg Press Horizontal', muscleGroup: 'Quadríceps', equipment: 'Leg Press', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-quads-007', name: 'Cadeira Extensora', muscleGroup: 'Quadríceps', equipment: 'Máquina', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-quads-008', name: 'Agachamento Goblet', muscleGroup: 'Quadríceps', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-quads-009', name: 'Afundo', muscleGroup: 'Quadríceps', equipment: 'Peso Corporal', recordType: 'bodyweight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-quads-010', name: 'Afundo com Halteres', muscleGroup: 'Quadríceps', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-quads-011', name: 'Afundo no Smith', muscleGroup: 'Quadríceps', equipment: 'Smith', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-quads-012', name: 'Passada com Halteres', muscleGroup: 'Quadríceps', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-quads-013', name: 'Agachamento Búlgaro', muscleGroup: 'Quadríceps', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },

  // POSTERIORES DE COXA (6)
  { id: 'tfive-hamstrings-001', name: 'Mesa Flexora', muscleGroup: 'Isquiotibiais', equipment: 'Máquina', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-hamstrings-002', name: 'Cadeira Flexora', muscleGroup: 'Isquiotibiais', equipment: 'Máquina', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-hamstrings-003', name: 'Flexora em Pé', muscleGroup: 'Isquiotibiais', equipment: 'Máquina', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-hamstrings-004', name: 'Stiff com Barra', muscleGroup: 'Isquiotibiais', equipment: 'Barra', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-hamstrings-005', name: 'Stiff com Halteres', muscleGroup: 'Isquiotibiais', equipment: 'Halteres', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-hamstrings-006', name: 'Levantamento Terra Romeno', muscleGroup: 'Isquiotibiais', equipment: 'Barra', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-hamstrings-007', name: 'Good Morning', muscleGroup: 'Isquiotibiais', equipment: 'Barra', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },

  // GLÚTEOS (7)
  { id: 'tfive-glutes-001', name: 'Elevação Pélvica com Barra', muscleGroup: 'Glúteos', equipment: 'Barra', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-glutes-002', name: 'Elevação Pélvica Máquina', muscleGroup: 'Glúteos', equipment: 'Máquina', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },
  { id: 'tfive-glutes-003', name: 'Glúteo na Polia', muscleGroup: 'Glúteos', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-glutes-004', name: 'Glúteo Máquina', muscleGroup: 'Glúteos', equipment: 'Máquina', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-glutes-005', name: 'Cadeira Abdutora', muscleGroup: 'Glúteos', equipment: 'Máquina', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-glutes-006', name: 'Abdução de Quadril na Polia', muscleGroup: 'Glúteos', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-glutes-007', name: 'Step-Up', muscleGroup: 'Glúteos', equipment: 'Banco', recordType: 'weight_reps', defaultRestSeconds: 90, executionSteps: [], isArchived: false },

  // ADUTORES (2) -> Mapeado para Quadríceps devido aos tipos permitidos, ou podemos tentar "Pernas". O Type permite "Quadríceps".
  { id: 'tfive-adductors-001', name: 'Cadeira Adutora', muscleGroup: 'Quadríceps', equipment: 'Máquina', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-adductors-002', name: 'Adução de Quadril na Polia', muscleGroup: 'Quadríceps', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },

  // PANTURRILHAS (5)
  { id: 'tfive-calves-001', name: 'Panturrilha em Pé', muscleGroup: 'Panturrilha', equipment: 'Peso Corporal', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-calves-002', name: 'Panturrilha em Pé Máquina', muscleGroup: 'Panturrilha', equipment: 'Máquina', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-calves-003', name: 'Panturrilha Sentado', muscleGroup: 'Panturrilha', equipment: 'Máquina', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-calves-004', name: 'Panturrilha no Leg Press', muscleGroup: 'Panturrilha', equipment: 'Leg Press', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-calves-005', name: 'Panturrilha no Smith', muscleGroup: 'Panturrilha', equipment: 'Smith', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },

  // CORE / ABDÔMEN (11)
  { id: 'tfive-core-001', name: 'Abdominal Supra', muscleGroup: 'Abdômen / Core', equipment: 'Peso Corporal', recordType: 'bodyweight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-core-002', name: 'Abdominal Infra', muscleGroup: 'Abdômen / Core', equipment: 'Peso Corporal', recordType: 'bodyweight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-core-003', name: 'Abdominal Máquina', muscleGroup: 'Abdômen / Core', equipment: 'Máquina', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-core-004', name: 'Abdominal na Polia', muscleGroup: 'Abdômen / Core', equipment: 'Polia', recordType: 'weight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-core-005', name: 'Prancha Frontal', muscleGroup: 'Abdômen / Core', equipment: 'Peso Corporal', recordType: 'isometry_time', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-core-006', name: 'Prancha Lateral', muscleGroup: 'Abdômen / Core', equipment: 'Peso Corporal', recordType: 'isometry_time', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-core-007', name: 'Elevação de Pernas', muscleGroup: 'Abdômen / Core', equipment: 'Peso Corporal', recordType: 'bodyweight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-core-008', name: 'Elevação de Joelhos', muscleGroup: 'Abdômen / Core', equipment: 'Peso Corporal', recordType: 'bodyweight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-core-009', name: 'Abdominal Bicicleta', muscleGroup: 'Abdômen / Core', equipment: 'Peso Corporal', recordType: 'bodyweight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-core-010', name: 'Dead Bug', muscleGroup: 'Abdômen / Core', equipment: 'Peso Corporal', recordType: 'bodyweight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },
  { id: 'tfive-core-011', name: 'Bird Dog', muscleGroup: 'Abdômen / Core', equipment: 'Peso Corporal', recordType: 'bodyweight_reps', defaultRestSeconds: 60, executionSteps: [], isArchived: false },

  // LEVANTAMENTOS / EXERCÍCIOS GERAIS (3)
  { id: 'tfive-lifts-001', name: 'Levantamento Terra', muscleGroup: 'Costas', equipment: 'Barra', recordType: 'weight_reps', defaultRestSeconds: 120, executionSteps: [], isArchived: false },
  { id: 'tfive-lifts-002', name: 'Levantamento Terra com Trap Bar', muscleGroup: 'Costas', equipment: 'Barra', recordType: 'weight_reps', defaultRestSeconds: 120, executionSteps: [], isArchived: false },
  { id: 'tfive-lifts-003', name: "Farmer's Walk", muscleGroup: 'Funcional & Cardio', equipment: 'Halteres', recordType: 'duration_distance', defaultRestSeconds: 90, executionSteps: [], isArchived: false },

  // CARDIO (7)
  { id: 'tfive-cardio-001', name: 'Esteira — Caminhada', muscleGroup: 'Funcional & Cardio', equipment: 'Cardio', recordType: 'duration_time', defaultRestSeconds: 0, executionSteps: [], isArchived: false },
  { id: 'tfive-cardio-002', name: 'Esteira — Corrida', muscleGroup: 'Funcional & Cardio', equipment: 'Cardio', recordType: 'duration_time', defaultRestSeconds: 0, executionSteps: [], isArchived: false },
  { id: 'tfive-cardio-003', name: 'Bicicleta Ergométrica', muscleGroup: 'Funcional & Cardio', equipment: 'Cardio', recordType: 'duration_time', defaultRestSeconds: 0, executionSteps: [], isArchived: false },
  { id: 'tfive-cardio-004', name: 'Bicicleta Spinning', muscleGroup: 'Funcional & Cardio', equipment: 'Cardio', recordType: 'duration_time', defaultRestSeconds: 0, executionSteps: [], isArchived: false },
  { id: 'tfive-cardio-005', name: 'Elíptico', muscleGroup: 'Funcional & Cardio', equipment: 'Cardio', recordType: 'duration_time', defaultRestSeconds: 0, executionSteps: [], isArchived: false },
  { id: 'tfive-cardio-006', name: 'Escada / Stair Climber', muscleGroup: 'Funcional & Cardio', equipment: 'Cardio', recordType: 'duration_time', defaultRestSeconds: 0, executionSteps: [], isArchived: false },
  { id: 'tfive-cardio-007', name: 'Remo Ergométrico', muscleGroup: 'Funcional & Cardio', equipment: 'Cardio', recordType: 'duration_time', defaultRestSeconds: 0, executionSteps: [], isArchived: false }
];
