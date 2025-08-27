import type { Logger } from 'pino';
import type { CopartVehicle } from '../copart';

export interface MarketComparison {
  averagePrice: number;
  priceRange: { min: number; max: number };
  marketTrend: 'above' | 'below' | 'average';
  confidence: number; // 0-100
  source: string;
  dataPoints: number;
}

/**
 * Get market comparison data for a vehicle using multiple strategies
 */
export async function getMarketComps(
  vehicle: CopartVehicle,
  logger: Logger,
): Promise<MarketComparison | null> {
  // Strategy 1: Try NHTSA 5-star safety rating as proxy for market value
  const nhtsaComp = await tryNHTSAComps(vehicle, logger);
  if (nhtsaComp) return nhtsaComp;

  // Strategy 2: Use heuristic valuation based on year/make/model/mileage
  return createHeuristicComps(vehicle, logger);
}

async function tryNHTSAComps(
  vehicle: CopartVehicle,
  logger: Logger,
): Promise<MarketComparison | null> {
  try {
    // NHTSA vehicle API for safety ratings (free, no auth required)
    const modelYear = vehicle.year;
    const make = encodeURIComponent(vehicle.make);
    const model = encodeURIComponent(vehicle.model);

    const url = `https://api.nhtsa.gov/SafetyRatings/modelyear/${modelYear}/make/${make}/model/${model}?format=json`;
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data: unknown = await response.json();
    const results = Array.isArray((data as Record<string, unknown>)?.Results)
      ? ((data as Record<string, unknown>).Results as Record<string, unknown>[])
      : [];

    if (results.length === 0) return null;

    // Use safety rating as a market indicator
    const safetyRating = Number(results[0]?.OverallRating) || 3;
    const baseValue = estimateBaseValue(vehicle);
    const safetyMultiplier = 0.8 + safetyRating * 0.05; // 0.8-1.05x based on 1-5 star rating

    const adjustedValue = baseValue * safetyMultiplier;
    const variance = adjustedValue * 0.15; // ±15% range

    return {
      averagePrice: Math.round(adjustedValue),
      priceRange: {
        min: Math.round(adjustedValue - variance),
        max: Math.round(adjustedValue + variance),
      },
      marketTrend:
        vehicle.currentBid < adjustedValue
          ? 'below'
          : vehicle.currentBid > adjustedValue * 1.1
            ? 'above'
            : 'average',
      confidence: 65, // Medium confidence for NHTSA-derived estimates
      source: 'NHTSA Safety + Heuristic',
      dataPoints: results.length,
    };
  } catch (error) {
    logger.debug({ err: error, vehicle: vehicle.id }, 'NHTSA comps failed');
    return null;
  }
}

function createHeuristicComps(
  vehicle: CopartVehicle,
  _logger: Logger,
): MarketComparison {
  const baseValue = estimateBaseValue(vehicle);
  const variance = baseValue * 0.2; // ±20% range for heuristic estimates

  return {
    averagePrice: Math.round(baseValue),
    priceRange: {
      min: Math.round(baseValue - variance),
      max: Math.round(baseValue + variance),
    },
    marketTrend:
      vehicle.currentBid < baseValue
        ? 'below'
        : vehicle.currentBid > baseValue * 1.15
          ? 'above'
          : 'average',
    confidence: 40, // Lower confidence for pure heuristics
    source: 'Heuristic Model',
    dataPoints: 1,
  };
}

function estimateBaseValue(vehicle: CopartVehicle): number {
  // Start with a baseline by make/model
  const makeBaselines: Record<string, number> = {
    Toyota: 22000,
    Honda: 21000,
    Ford: 19000,
    Chevrolet: 18000,
    Nissan: 17000,
    Hyundai: 16000,
    Kia: 15000,
    Subaru: 23000,
    BMW: 35000,
    'Mercedes-Benz': 40000,
    Audi: 32000,
    Lexus: 30000,
    Tesla: 45000,
    Ram: 25000,
    Jeep: 22000,
    Dodge: 20000,
  };

  const basePrice = makeBaselines[vehicle.make] || 18000;

  // Age depreciation: 15% per year after 3 years, 10% for first 3 years
  const currentYear = new Date().getFullYear();
  const age = Math.max(0, currentYear - vehicle.year);
  let depreciationFactor = 1.0;

  if (age <= 3) {
    depreciationFactor = 0.9 ** age; // 10% per year
  } else {
    depreciationFactor = 0.9 ** 3 * 0.85 ** (age - 3); // 10% for first 3, then 15%
  }

  // Mileage adjustment: -$0.10 per mile over 15k/year
  const expectedMileage = age * 15000;
  const excessMileage = Math.max(0, vehicle.mileage - expectedMileage);
  const mileageAdjustment = excessMileage * 0.1;

  // Damage adjustment
  const damageMultipliers: Record<string, number> = {
    none: 1.0,
    minor: 0.85,
    moderate: 0.7,
    severe: 0.5,
    salvage: 0.3,
  };
  const damageMultiplier =
    damageMultipliers[vehicle.damage.toLowerCase()] || 0.75;

  return Math.round(
    basePrice * depreciationFactor * damageMultiplier - mileageAdjustment,
  );
}
