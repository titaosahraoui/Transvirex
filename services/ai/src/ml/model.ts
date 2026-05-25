/**
 * TensorFlow.js neural network for driver assignment scoring.
 *
 * Architecture:
 *   Input:  7 features, all normalized to [0, 1]
 *   Hidden: Dense(16, relu) → Dense(8, relu)
 *   Output: Dense(1, sigmoid) → assignment_success_probability
 *
 * Training:
 *   - ~2 000 synthetic samples generated at startup
 *   - 50 epochs, batch size 32
 */

import * as tf from '@tensorflow/tfjs';

// ── Feature vector type ───────────────────────────────────────────────────────
export interface DriverFeatures {
  distanceKm:      number; // distance from driver to pickup (km)
  currentLoad:     number; // number of active missions (0–10)
  acceptanceRate:  number; // 0–100 (%)
  experienceDays:  number; // days since first mission (0–3650)
  missionUrgency:  number; // 0 = low, 1 = urgent (hours until deadline)
  timeOfDayScore:  number; // 0–1 (peak=0, off-peak=1)
  zoneMatch:       number; // 1 if driver's home zone = pickup zone, else 0
}

// Normalisation bounds (max values used to squash features to [0,1])
const MAX = {
  distanceKm:     100,
  currentLoad:    10,
  acceptanceRate: 100,
  experienceDays: 3650,
};

export function normalizeFeatures(f: DriverFeatures): number[] {
  return [
    Math.min(f.distanceKm      / MAX.distanceKm,      1),
    Math.min(f.currentLoad     / MAX.currentLoad,      1),
    Math.min(f.acceptanceRate  / MAX.acceptanceRate,   1),
    Math.min(f.experienceDays  / MAX.experienceDays,   1),
    Math.min(f.missionUrgency,                         1), // already 0-1
    Math.min(f.timeOfDayScore,                         1), // already 0-1
    f.zoneMatch,                                           // 0 or 1
  ];
}

// ── Synthetic training data ───────────────────────────────────────────────────
function generateTrainingData(count = 2000): { xs: number[][]; ys: number[] } {
  const xs: number[][] = [];
  const ys: number[] = [];

  for (let i = 0; i < count; i++) {
    const distance      = Math.random() * 100;
    const load          = Math.floor(Math.random() * 11);
    const acceptance    = Math.random() * 100;
    const experience    = Math.random() * 3650;
    const urgency       = Math.random();
    const timeOfDay     = Math.random();
    const zone          = Math.random() > 0.5 ? 1 : 0;

    // Heuristic: high acceptance rate, low load, close distance → likely success
    const score =
      (acceptance / 100) * 0.35 +
      (1 - load / 10) * 0.25 +
      (1 - distance / 100) * 0.20 +
      (experience / 3650) * 0.10 +
      zone * 0.10;

    const label = score + (Math.random() - 0.5) * 0.2 > 0.5 ? 1 : 0;

    xs.push([
      distance / 100,
      load / 10,
      acceptance / 100,
      experience / 3650,
      urgency,
      timeOfDay,
      zone,
    ]);
    ys.push(label);
  }
  return { xs, ys };
}

// ── Model singleton ───────────────────────────────────────────────────────────
let _model: tf.LayersModel | null = null;

export async function getModel(): Promise<tf.LayersModel> {
  if (_model) return _model;

  // Build architecture
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [7], units: 16, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy'],
  });

  // Train on synthetic data
  const { xs, ys } = generateTrainingData(2000);
  const xTensor = tf.tensor2d(xs);
  const yTensor = tf.tensor2d(ys, [ys.length, 1]);

  await model.fit(xTensor, yTensor, {
    epochs: 50,
    batchSize: 32,
    shuffle: true,
    verbose: 0, // suppress per-epoch logging
  });

  xTensor.dispose();
  yTensor.dispose();

  console.log('[ai] Model trained on 2 000 synthetic samples (50 epochs)');
  _model = model;
  return model;
}

/**
 * Score a list of drivers for a given mission.
 * Returns the same list augmented with a `score` (0–1).
 */
export async function scoreDrivers(
  drivers: Array<DriverFeatures & { driverId: string; name: string }>
): Promise<Array<{ driverId: string; name: string; score: number; features: DriverFeatures }>> {
  if (drivers.length === 0) return [];

  const model = await getModel();

  const inputMatrix = drivers.map((d) => normalizeFeatures(d));
  const inputTensor = tf.tensor2d(inputMatrix);

  const predictions = model.predict(inputTensor) as tf.Tensor;
  const scores = await predictions.data();

  inputTensor.dispose();
  predictions.dispose();

  return drivers
    .map((d, i) => ({
      driverId: d.driverId,
      name: d.name,
      score: Math.round(scores[i] * 1000) / 1000, // 3 decimal places
      features: {
        distanceKm:     d.distanceKm,
        currentLoad:    d.currentLoad,
        acceptanceRate: d.acceptanceRate,
        experienceDays: d.experienceDays,
        missionUrgency: d.missionUrgency,
        timeOfDayScore: d.timeOfDayScore,
        zoneMatch:      d.zoneMatch,
      },
    }))
    .sort((a, b) => b.score - a.score); // best first
}

/** Reset the cached model (used in tests). */
export function _resetModel(): void {
  _model = null;
}
