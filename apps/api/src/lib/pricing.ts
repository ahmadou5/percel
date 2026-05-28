export type OrderSize = 'SMALL' | 'MEDIUM' | 'LARGE';

export interface PriceQuote {
  size: OrderSize;
  distanceKm: number;
  durationMin: number;
  basePrice: number;
  distanceMultiplier: number;
  surgeMultiplier: number;
  totalPrice: number;
  currency: 'NGN';
  breakdown: {
    sizeLabel: string;
    distanceBand: string;
    surgeApplied: boolean;
  };
}

const basePrices: Record<OrderSize, number> = {
  SMALL: 500,
  MEDIUM: 1200,
  LARGE: 2500,
};

function distanceMultiplier(distanceKm: number) {
  if (distanceKm <= 10) return 1;
  if (distanceKm <= 50) return 1.4;
  if (distanceKm <= 200) return 2;
  return 3;
}

function distanceBand(distanceKm: number) {
  if (distanceKm <= 10) return '0-10km';
  if (distanceKm <= 50) return '10-50km';
  if (distanceKm <= 200) return '50-200km';
  return '200km+';
}

export function getPriceQuote(
  size: OrderSize,
  distanceKm: number,
  durationMin = 0,
  onlineDriverCount = 3,
): PriceQuote {
  const basePrice = basePrices[size];
  const dm = distanceMultiplier(distanceKm);
  const surgeMultiplier = onlineDriverCount < 3 ? 1.3 : 1;

  return {
    size,
    distanceKm: Number(distanceKm.toFixed(2)),
    durationMin: Number(durationMin.toFixed(0)),
    basePrice,
    distanceMultiplier: dm,
    surgeMultiplier,
    totalPrice: Number((basePrice * dm * surgeMultiplier).toFixed(2)),
    currency: 'NGN',
    breakdown: {
      sizeLabel: size,
      distanceBand: distanceBand(distanceKm),
      surgeApplied: surgeMultiplier > 1,
    },
  };
}
