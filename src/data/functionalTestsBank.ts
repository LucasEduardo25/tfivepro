import { FunctionalTest, FunctionalBattery } from '../types/functionalLongevity';

export const BUILT_IN_FUNCTIONAL_TESTS: FunctionalTest[] = [
  {
    id: 'test-30s-chair-stand',
    name: 'Sentar e Levantar da Cadeira — 30s',
    shortName: 'Sentar/Levantar 30s',
    domain: 'strength',
    autonomyTask: 'stand_up',
    category: 'Força & Potência de Membros Inferiores',
    unit: 'reps',
    unitLabel: 'reps',
    direction: 'higher_is_better',
    defaultDurationSeconds: 30,
    hasArmSupportOption: true,
    hasStepHeightOption: false,
    isBuiltIn: true,
    isFavorite: true,
    instructions: [
      'Posicione uma cadeira padrão (~43 a 45 cm de altura) encostada na parede com segurança.',
      'O aluno senta-se no meio da cadeira, pés apoiados no chão e braços cruzados sobre o peito.',
      'Ao sinal de "Já", o aluno levanta-se completamente e senta-se novamente o maior número de vezes em 30 segundos.',
      'Conte apenas repetições completas em que a extensão de quadril/joelho for total.'
    ],
    tips: [
      'Se o aluno precisar usar as mãos para empurrar as coxas ou braços da cadeira, registre na opção correspondente.',
      'Mantenha a segurança e fique próximo caso haja desequilíbrio.'
    ]
  },
  {
    id: 'test-5x-chair-stand',
    name: '5x Sentar e Levantar',
    shortName: '5x Sentar/Levantar',
    domain: 'strength',
    autonomyTask: 'stand_up',
    category: 'Força & Potência de Membros Inferiores',
    unit: 'seconds',
    unitLabel: 's',
    direction: 'lower_is_better',
    hasArmSupportOption: true,
    isBuiltIn: true,
    isFavorite: true,
    instructions: [
      'O aluno inicia sentado na cadeira com braços cruzados sobre o peito.',
      'Ao sinal, o aluno deve levantar e sentar 5 vezes consecutivas o mais rápido possível e de forma segura.',
      'O cronômetro para no momento em que o aluno se senta completamente pela 5ª vez.'
    ],
    tips: [
      'Atenção: Menor tempo representa melhor capacidade e potência.',
      'Observe a estabilidade dos joelhos e o contato dos pés durante as 5 repetições.'
    ]
  },
  {
    id: 'test-tug',
    name: 'Timed Up and Go — TUG',
    shortName: 'TUG (3m)',
    domain: 'locomotion',
    autonomyTask: 'walk',
    category: 'Mobilidade, Marcha & Agilidade Funcional',
    unit: 'seconds',
    unitLabel: 's',
    direction: 'lower_is_better',
    hasAssistiveDeviceOption: true,
    isBuiltIn: true,
    isFavorite: true,
    instructions: [
      'Posicione um cone ou marca no chão a exatamente 3 metros de distância da cadeira.',
      'O aluno inicia sentado confortavelmente com as costas encostadas no encosto.',
      'Ao sinal de "Iniciar", o aluno levanta, caminha em ritmo habitual e seguro até a marca de 3m, dá a volta, retorna e senta-se novamente.',
      'O cronômetro inicia no primeiro movimento de tronco e para no momento em que as costas tocam o encosto da cadeira.'
    ],
    tips: [
      'Permita que o aluno utilize seu calçado de uso diário e dispositivo auxiliar (bengala/andador) se costuma usar.',
      'Menor tempo = melhor mobilidade funcional e agilidade.'
    ]
  },
  {
    id: 'test-gait-speed',
    name: 'Velocidade de Marcha',
    shortName: 'Velocidade Marcha',
    domain: 'locomotion',
    autonomyTask: 'walk',
    category: 'Capacidade Locomotora & Marcha',
    unit: 'm/s',
    unitLabel: 'm/s',
    direction: 'higher_is_better',
    hasAssistiveDeviceOption: true,
    hasMultipleTrials: true,
    isBuiltIn: true,
    isFavorite: true,
    instructions: [
      'Marque uma distância retilínea (comumente 4 metros ou 6 metros, com 1m de aceleração e 1m de desaceleração).',
      'O aluno caminha no seu ritmo habitual e seguro.',
      'Cronometre o tempo gasto no percurso central.',
      'O TFIVE calcula automaticamente a velocidade em metros por segundo (m/s).'
    ],
    tips: [
      'Velocidade calculada = Distância (m) / Tempo (s).',
      'Maior velocidade em ritmo seguro reflete melhor capacidade locomotora.'
    ]
  },
  {
    id: 'test-6min-walk',
    name: 'Teste de Caminhada de 6 Minutos',
    shortName: 'Caminhada 6min',
    domain: 'endurance',
    autonomyTask: 'walk',
    category: 'Resistência Cardiorrespiratória & Locomoção',
    unit: 'meters',
    unitLabel: 'm',
    direction: 'higher_is_better',
    defaultDurationSeconds: 360,
    hasAssistiveDeviceOption: true,
    isBuiltIn: true,
    isFavorite: false,
    instructions: [
      'Em um corredor ou pista plana de 20 a 30 metros demarcada com cones nas extremidades.',
      'O aluno caminha continuamente durante 6 minutos, cobrindo o máximo de voltas/distância de forma segura e confortável.',
      'O aluno pode reduzir o ritmo ou descansar de pé se necessário, mas o cronômetro não para.',
      'Ao término de 6 minutos, registre a distância total percorrida em metros e eventuais interrupções.'
    ],
    tips: [
      'Mantenha incentivo padronizado a cada minuto ("Você está indo muito bem", "Faltam 2 minutos").',
      'Não interprete clinicamente sem protocolo médico formal.'
    ]
  },
  {
    id: 'test-single-leg-stance',
    name: 'Apoio Unipodal (Equilíbrio)',
    shortName: 'Apoio Unipodal',
    domain: 'balance',
    autonomyTask: 'balance',
    category: 'Equilíbrio Estático & Estabilidade',
    unit: 'seconds',
    unitLabel: 's',
    direction: 'higher_is_better',
    hasBilateral: true,
    hasEyesCondition: true,
    hasMultipleTrials: true,
    hasArmSupportOption: true,
    isBuiltIn: true,
    isFavorite: true,
    instructions: [
      'O aluno fica descalço ou de tênis estável, cruza os braços no peito e levanta um dos pés sem encostar na perna de apoio.',
      'Cronometre o tempo em que o aluno mantém a posição estável (máximo de 30s ou 45s por tentativa).',
      'O teste é interrompido se o pé elevado tocar o chão, a perna de apoio se mover ou os braços se descruzarem para recuperar o equilíbrio.',
      'Repita para perna direita e perna esquerda, com olhos abertos (e fechados, se aplicável).'
    ],
    tips: [
      'Permite até 3 tentativas por lado, adotando a melhor tentativa para a evolução.',
      'Fique posicionado ao lado do aluno com braços prontos para suporte.'
    ]
  },
  {
    id: 'test-tandem-stance',
    name: 'Equilíbrio Tandem',
    shortName: 'Tandem Stance',
    domain: 'balance',
    autonomyTask: 'balance',
    category: 'Equilíbrio Estático & Base Estreita',
    unit: 'seconds',
    unitLabel: 's',
    direction: 'higher_is_better',
    hasBilateral: true,
    isBuiltIn: true,
    isFavorite: false,
    instructions: [
      'O aluno posiciona os pés alinhados um diretamente à frente do outro (calcanhar do pé da frente tocando a ponta do pé de trás).',
      'Braços cruzados no peito ou livres, olhando para frente.',
      'Cronometre o tempo de sustentação da postura estável até o limite de 30 segundos.'
    ],
    tips: [
      'Avalie com pé direito à frente e depois pé esquerdo à frente.'
    ]
  },
  {
    id: 'test-step-test',
    name: 'Subir e Descer Degrau',
    shortName: 'Degrau Funcional',
    domain: 'mobility',
    autonomyTask: 'climb',
    category: 'Mobilidade Articular & Força Unilateral',
    unit: 'reps',
    unitLabel: 'reps',
    direction: 'higher_is_better',
    hasStepHeightOption: true,
    hasArmSupportOption: true,
    isBuiltIn: true,
    isFavorite: false,
    instructions: [
      'Utilize um degrau ou step firme (altura registrada, ex: 15 a 20 cm).',
      'O aluno sobe com um pé, sobe com o outro completando a extensão, e desce retornando à posição inicial.',
      'Pode ser avaliado por número de repetições completas em tempo determinado ou tempo para completar X repetições.'
    ],
    tips: [
      'Registre se utilizou corrimão/apoio e se houve assimetria entre os membros.'
    ]
  },
  {
    id: 'test-floor-rise',
    name: 'Levantar do Chão',
    shortName: 'Levantar do Chão',
    domain: 'autonomy',
    autonomyTask: 'floor_rise',
    category: 'Autonomia, Força Integrada & Independência',
    unit: 'levels',
    unitLabel: 'nível',
    direction: 'categorical_levels',
    categoricalLevels: [
      { level: 1, label: 'Com ajuda de outra pessoa', description: 'Necessita auxílio físico externo de outra pessoa para erguer-se.' },
      { level: 2, label: 'Com apoio em objeto', description: 'Apoia as mãos em uma cadeira, sofá, móvel ou bastão para conseguir levantar.' },
      { level: 3, label: 'Com apoio das mãos no chão', description: 'Consegue levantar-se de forma autônoma apoiando mãos ou joelhos no chão.' },
      { level: 4, label: 'Sem apoio externo', description: 'Levanta-se do chão com total controle e fluidez, sem apoiar mãos no chão ou móveis.' }
    ],
    isBuiltIn: true,
    isFavorite: true,
    instructions: [
      'Em um colchonete firme ou piso antiderrapante, o aluno senta ou deita-se no chão.',
      'Solicite que o aluno se levante da forma mais confortável, segura e independente possível.',
      'Observe a estratégia utilizada e selecione o nível correspondente de autonomia.',
      'Opcionalmente, cronometre o tempo gasto do início da intenção até a posição ereta.'
    ],
    tips: [
      'Este é um dos testes mais reveladores de autonomia real e independência para a vida.',
      'Registre no campo de observações a estratégia motora (ex: rolamento lateral, posição de cavaleiro, semiflexão).'
    ]
  },
  {
    id: 'test-farmer-carry',
    name: 'Carregar Peso (Farmer Carry)',
    shortName: 'Carregar Peso',
    domain: 'strength',
    autonomyTask: 'carry',
    category: 'Força de Sustentação & Atividades Cotidianas',
    unit: 'kg',
    unitLabel: 'kg',
    direction: 'higher_is_better',
    isBuiltIn: true,
    isFavorite: true,
    instructions: [
      'O aluno segura uma carga determinada (halteres, kettlebells ou sacolas funcionais) nas mãos (bilateral ou unilateral).',
      'Caminha com postura ereta, passos controlados e respiração ativa por uma distância determinada (ex: 20m ou 40m).',
      'Registre a carga total (kg), distância percorrida (m) e se foi bilateral ou unilateral.'
    ],
    tips: [
      'Excelente correspondência com tarefas cotidianas (compras de mercado, malas, carregar netos).'
    ]
  },
  {
    id: 'test-stair-climb',
    name: 'Subir Escadas',
    shortName: 'Subir Escadas',
    domain: 'autonomy',
    autonomyTask: 'climb',
    category: 'Capacidade Locomotora & Força Funcional',
    unit: 'seconds',
    unitLabel: 's',
    direction: 'lower_is_better',
    isBuiltIn: true,
    isFavorite: false,
    instructions: [
      'Em um lance de escadas padronizado (ex: 10 ou 12 degraus seguros com corrimão).',
      'O aluno sobe os degraus em ritmo habitual e seguro.',
      'Cronometre o tempo total desde o primeiro pé no primeiro degrau até ambos os pés no patamar superior.',
      'Registre se utilizou corrimão e se houve pausas para descanso.'
    ],
    tips: [
      'Menor tempo com segurança reflete melhor capacidade motora e autonomia vertical.'
    ]
  },
  {
    id: 'test-squat-and-rise',
    name: 'Agachar e Levantar (Funcional)',
    shortName: 'Agachar e Levantar',
    domain: 'strength',
    autonomyTask: 'squat',
    category: 'Força, Controle Motor & Mobilidade de Quadril',
    unit: 'reps',
    unitLabel: 'reps',
    direction: 'higher_is_better',
    isBuiltIn: true,
    isFavorite: false,
    instructions: [
      'Avalie a capacidade do aluno de agachar até a profundidade funcional acordada (ex: paralelo ou banco alvo) e retornar à postura ereta.',
      'Pode registrar repetições com peso corporal ou com carga funcional leve.'
    ],
    tips: [
      'Diferente do teste da cadeira: avalia o controle ativo do movimento livre.'
    ]
  },
  {
    id: 'test-grip-strength',
    name: 'Força de Preensão Manual (Dinamometria)',
    shortName: 'Preensão Manual',
    domain: 'strength',
    autonomyTask: 'carry',
    category: 'Força Isométrica Global',
    unit: 'kg',
    unitLabel: 'kgf',
    direction: 'higher_is_better',
    hasBilateral: true,
    hasMultipleTrials: true,
    isBuiltIn: true,
    isFavorite: false,
    instructions: [
      'Utilize um dinamômetro manual hidráulico ou digital calibrado (ex: Jamar).',
      'O aluno sentado confortavelmente, ombro aduzido, cotovelo fletido a 90° e antebraço em posição neutra.',
      'Ao comando, o aluno aperta a manopla com força máxima contínua por cerca de 3 a 5 segundos.',
      'Realize 2 a 3 tentativas para cada mão com descanso entre elas, adotando a melhor marca.'
    ],
    tips: [
      'Teste opcional quando o treinador dispõe do equipamento apropriado.',
      'Não transforme em diagnóstico clínico isolado.'
    ]
  }
];

export const BUILT_IN_FUNCTIONAL_BATTERIES: FunctionalBattery[] = [
  {
    id: 'bat-longevity-tfive',
    title: 'Bateria Longevidade TFIVE',
    description: 'Protocolo completo dos 5 pilares essenciais: Sentar/Levantar 30s, TUG, Apoio Unipodal, Levantar do Chão e Carregar Peso.',
    testIds: [
      'test-30s-chair-stand',
      'test-tug',
      'test-single-leg-stance',
      'test-floor-rise',
      'test-farmer-carry'
    ],
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'bat-functional-60plus',
    title: 'Bateria Funcional 60+',
    description: 'Avaliação ágil de força, mobilidade, agilidade e equilíbrio dinâmico.',
    testIds: [
      'test-5x-chair-stand',
      'test-tug',
      'test-single-leg-stance',
      'test-gait-speed',
      'test-floor-rise'
    ],
    isDefault: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'bat-quick-autonomy',
    title: 'Triagem Rápida de Autonomia',
    description: 'Avaliação compacta de 3 testes fundamentais para independência motora diária.',
    testIds: [
      'test-30s-chair-stand',
      'test-tug',
      'test-floor-rise'
    ],
    isDefault: false,
    createdAt: new Date().toISOString()
  }
];
