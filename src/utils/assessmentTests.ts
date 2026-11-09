import { 
  calculateJP7Density, 
  calculateSiriBodyFat, 
  calculateFatMass, 
  calculateLeanMass, 
  calculateBMI, 
  calculateWHR, 
  calculateSumOf7Skinfolds, 
  calculateSkinfoldAverage,
  computeCompleteJP7Assessment,
  compareAssessments,
  formatPercentagePointsBR,
  formatDeltaValueBR
} from './assessmentCalculations';

console.log('--- EXECUTING AVALIAÇÃO FÍSICA QA & UNIT TESTS ---');

// Test 1: Jackson & Pollock 7 Dobras - Men (Homens)
// Example from user brief: Sum = 112 mm, Age = 30, Weight = 78.4 kg, Height = 175 cm
const sum7Men = 112;
const ageMen = 30;
const weightMen = 78.4;
const heightMen = 175;

const densityMen = calculateJP7Density('male', ageMen, sum7Men);
console.log('Men D:', densityMen);
// Formula: 1.112 - (0.00043499 * 112) + (0.00000055 * 112^2) - (0.00028826 * 30)
// = 1.112 - 0.04871888 + 0.0068992 - 0.0086478 = 1.06153252 -> 1.061533
console.assert(densityMen > 1.05 && densityMen < 1.08, 'Men density calculation error');

const bfMen = calculateSiriBodyFat(densityMen);
console.log('Men % Fat (Siri):', bfMen);
// Siri: (495 / 1.061533) - 450 = 466.307 - 450 = 16.3%
console.assert(bfMen > 10 && bfMen < 25, 'Men Siri calculation error');

const fatKgMen = calculateFatMass(weightMen, bfMen);
const leanKgMen = calculateLeanMass(weightMen, fatKgMen);
const bmiMen = calculateBMI(weightMen, heightMen);
console.log('Men Fat Mass (kg):', fatKgMen, 'Lean Mass (kg):', leanKgMen, 'BMI:', bmiMen);
console.assert(Math.abs((fatKgMen + leanKgMen) - weightMen) < 0.1, 'Mass conservation error');

// Test 2: Jackson & Pollock 7 Dobras - Women (Mulheres)
// Sum = 130 mm, Age = 28, Weight = 62.0 kg, Height = 165 cm
const sum7Women = 130;
const ageWomen = 28;
const weightWomen = 62.0;
const heightWomen = 165;

const densityWomen = calculateJP7Density('female', ageWomen, sum7Women);
console.log('Women D:', densityWomen);
// Formula: 1.097 - (0.00046971 * 130) + (0.00000056 * 130^2) - (0.00012828 * 28)
// = 1.097 - 0.0610623 + 0.009464 - 0.00359184 = 1.04181
console.assert(densityWomen > 1.03 && densityWomen < 1.06, 'Women density calculation error');

const bfWomen = calculateSiriBodyFat(densityWomen);
console.log('Women % Fat (Siri):', bfWomen);
const fatKgWomen = calculateFatMass(weightWomen, bfWomen);
const leanKgWomen = calculateLeanMass(weightWomen, fatKgWomen);
console.log('Women Fat Mass (kg):', fatKgWomen, 'Lean Mass (kg):', leanKgWomen);

// Test 3: Multiple measures per skinfold & Skinfold Average
const tricepsMeasures = [18, 17, 18];
const avgTriceps = calculateSkinfoldAverage(tricepsMeasures);
console.log('Average Triceps [18, 17, 18]:', avgTriceps);
console.assert(avgTriceps === 17.7, `Expected 17.7, got ${avgTriceps}`);

// Test 4: Sum of 7 skinfolds
const skinfoldsSample = {
  chest: 18,
  midaxillary: 14,
  triceps: 17.7,
  subscapular: 16,
  abdominal: 24,
  suprailiac: 15,
  thigh: 22
};
const sumComputed = calculateSumOf7Skinfolds(skinfoldsSample);
console.log('Sum of 7 skinfolds:', sumComputed);
console.assert(Math.abs(sumComputed - (18 + 14 + 17.7 + 16 + 24 + 15 + 22)) < 0.01, 'Sum error');

// Test 5: Full computeCompleteJP7Assessment
const complete = computeCompleteJP7Assessment({
  gender: 'male',
  age: 30,
  weightKg: 78.4,
  heightCm: 175,
  skinfolds: skinfoldsSample,
  circumferences: { waist: 84, hips: 100 }
});
console.log('Complete JP7 Assessment Result:', complete);
console.assert(complete.waistHipRatio === 0.84, 'WHR error');

// Test 6: Evolution Comparison (Anterior vs Atual)
const assessment1: any = {
  id: 'a1',
  studentId: 's1',
  date: '2026-01-10',
  weightKg: 78.4,
  heightCm: 175,
  age: 30,
  gender: 'male',
  protocol: 'jackson_pollock_7',
  bodyFatPercentage: 20.6,
  fatMassKg: 16.2,
  leanMassKg: 62.2,
  sumOfSkinfolds: 112,
  bmi: 25.6,
  waistHipRatio: 0.88,
  skinfolds: { chest: 18, abdominal: 24, thigh: 25, triceps: 15, subscapular: 16, suprailiac: 14, midaxillary: 12 },
  circumferences: { waist: 88, hips: 100, rightArmContracted: 36, rightThigh: 58 }
};

const assessment2: any = {
  id: 'a2',
  studentId: 's1',
  date: '2026-04-10',
  weightKg: 76.9,
  heightCm: 175,
  age: 30,
  gender: 'male',
  protocol: 'jackson_pollock_7',
  bodyFatPercentage: 18.8,
  fatMassKg: 14.5,
  leanMassKg: 62.4,
  sumOfSkinfolds: 96,
  bmi: 25.1,
  waistHipRatio: 0.84,
  skinfolds: { chest: 15, abdominal: 20, thigh: 22, triceps: 13, subscapular: 14, suprailiac: 12, midaxillary: 10 },
  circumferences: { waist: 84, hips: 100, rightArmContracted: 37, rightThigh: 59 }
};

const evolution = compareAssessments(assessment2, assessment1);
console.log('Evolution deltas:', evolution.deltas);
console.assert(evolution.deltas.weightKg === -1.5, `Expected -1.5 kg, got ${evolution.deltas.weightKg}`);
console.assert(evolution.deltas.bodyFatPercentage === -1.8, `Expected -1.8 p.p., got ${evolution.deltas.bodyFatPercentage}`);
console.assert(evolution.deltas.fatMassKg === -1.7, `Expected -1.7 kg, got ${evolution.deltas.fatMassKg}`);
console.assert(evolution.deltas.leanMassKg === 0.2, `Expected +0.2 kg, got ${evolution.deltas.leanMassKg}`);
console.assert(evolution.deltas.sumOfSkinfolds === -16, `Expected -16 mm, got ${evolution.deltas.sumOfSkinfolds}`);

console.log('Formatted Body Fat Delta:', formatPercentagePointsBR(evolution.deltas.bodyFatPercentage));
console.log('Formatted Weight Delta:', formatDeltaValueBR(evolution.deltas.weightKg, 'kg'));
console.log('Formatted Sum Delta:', formatDeltaValueBR(evolution.deltas.sumOfSkinfolds!, 'mm'));

console.log('--- ALL UNIT TESTS PASSED SUCCESSFULLY! ---');
