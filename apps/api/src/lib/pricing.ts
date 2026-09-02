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
  deliveryType?: 'INTERSTATE' | 'INTRASTATE';
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

export function vehicleMultiplier(vehicleType?: string | null): number {
  switch (vehicleType) {
    case 'TRICYCLE':
      return 1.25;
    case 'VAN':
      return 1.5;
    case 'TRUCK':
      return 2.0;
    default:
      return 1.0;
  }
}

export function getPriceQuote(
  size: OrderSize,
  distanceKm: number,
  durationMin = 0,
  onlineDriverCount = 3,
  deliveryType: 'INTERSTATE' | 'INTRASTATE' = 'INTERSTATE',
  serviceArea?: { baseFareNgn: any; perKmNgn: any } | null,
  routeContext?: { baseFare: number; originModifier?: number; destModifier?: number } | null,
  vehicleType?: string | null,
): PriceQuote {
  if (deliveryType === 'INTERSTATE' && routeContext) {
    const baseFare = routeContext.baseFare;
    const originModifier = routeContext.originModifier ?? 0;
    const destModifier = routeContext.destModifier ?? 0;
    const sizeMultiplier = size === 'SMALL' ? 1.0 : size === 'MEDIUM' ? 1.4 : 2.0;
    const basePrice = (baseFare + originModifier + destModifier) * sizeMultiplier * vehicleMultiplier(vehicleType);
    const surgeMultiplier = onlineDriverCount < 3 ? 1.2 : 1;
    const totalPrice = Number((basePrice * surgeMultiplier).toFixed(2));

    return {
      size,
      distanceKm: Number(distanceKm.toFixed(2)),
      durationMin: Number(durationMin.toFixed(0)),
      basePrice: Number(basePrice.toFixed(2)),
      distanceMultiplier: 1,
      surgeMultiplier,
      totalPrice,
      currency: 'NGN',
      breakdown: {
        sizeLabel: size,
        distanceBand: 'Interstate route',
        surgeApplied: surgeMultiplier > 1,
      },
    };
  }

  if (deliveryType === 'INTRASTATE' && serviceArea) {
    const baseFare = Number(serviceArea.baseFareNgn);
    const perKmRate = Number(serviceArea.perKmNgn);

    const sizeMultiplier = size === 'SMALL' ? 1.0 : size === 'MEDIUM' ? 1.5 : 2.2;
    const basePrice = baseFare * sizeMultiplier * vehicleMultiplier(vehicleType);

    const surgeMultiplier = onlineDriverCount < 2 ? 1.25 : 1;
    const calculatedPrice = (basePrice + distanceKm * perKmRate) * surgeMultiplier;
    const totalPrice = Math.max(1200, Number(calculatedPrice.toFixed(2)));

    return {
      size,
      distanceKm: Number(distanceKm.toFixed(2)),
      durationMin: Number(durationMin.toFixed(0)),
      basePrice: Number(basePrice.toFixed(2)),
      distanceMultiplier: 1,
      surgeMultiplier,
      totalPrice,
      currency: 'NGN',
      breakdown: {
        sizeLabel: size,
        distanceBand: 'Local delivery',
        surgeApplied: surgeMultiplier > 1,
      },
    };
  }

  const basePrice = basePrices[size] * vehicleMultiplier(vehicleType);
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
