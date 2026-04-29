function hash(seed: number): number {
  let x = (seed * 9301 + 49297) % 233280;
  return x / 233280;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function statusFor(
  ph: number,
  moisture: number,
  temp: number,
): "optimal" | "watch" | "alert" {
  if (
    ph < 5.2 ||
    ph > 7.6 ||
    moisture < 18 ||
    moisture > 88 ||
    temp < 8 ||
    temp > 35
  ) {
    return "alert";
  }
  if (ph < 5.7 || ph > 7.2 || moisture < 28 || moisture > 78) {
    return "watch";
  }
  return "optimal";
}

export function simulateLatestSoil(gardenPlantId: number) {
  const t = Math.floor(Date.now() / (1000 * 60 * 30));
  return simulateAt(gardenPlantId, t);
}

function simulateAt(gardenPlantId: number, tick: number) {
  const seed = gardenPlantId * 1000 + tick;
  const ph = clamp(6.2 + (hash(seed + 1) - 0.5) * 1.6, 4.5, 8.5);
  const temperatureC = clamp(20 + (hash(seed + 2) - 0.5) * 14, 5, 38);
  const humidityPct = clamp(58 + (hash(seed + 3) - 0.5) * 40, 20, 95);
  const moisturePct = clamp(52 + (hash(seed + 4) - 0.5) * 60, 10, 95);
  const recordedAt = new Date(tick * 1000 * 60 * 30);
  return {
    gardenPlantId,
    recordedAt: recordedAt.toISOString(),
    ph: Number(ph.toFixed(2)),
    temperatureC: Number(temperatureC.toFixed(1)),
    humidityPct: Number(humidityPct.toFixed(1)),
    moisturePct: Number(moisturePct.toFixed(1)),
    status: statusFor(ph, moisturePct, temperatureC),
  };
}

export function simulateHistory(gardenPlantId: number, hours = 24) {
  const now = Math.floor(Date.now() / (1000 * 60 * 30));
  const out: ReturnType<typeof simulateAt>[] = [];
  for (let i = hours * 2 - 1; i >= 0; i--) {
    out.push(simulateAt(gardenPlantId, now - i));
  }
  return out;
}
