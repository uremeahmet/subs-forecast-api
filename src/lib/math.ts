export const round2 = (value: number) => Math.round(value * 100) / 100;
export const round4 = (value: number) => Math.round(value * 10000) / 10000;

export const safeDivide = (numerator: number, denominator: number, fallback = 0) => {
  if (denominator === 0) {
    return fallback;
  }
  return numerator / denominator;
};

export const clamp = (value: number, min: number, max: number) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};
