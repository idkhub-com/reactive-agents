import type { Logger } from 'pino';
import type { CopartVehicle } from '../copart';

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high';
  score: number; // 0-100, higher = riskier
  factors: string[];
  warnings: string[];
  confidence: number; // 0-100
}

/**
 * Assess risk factors for a vehicle purchase
 */
export function assessRisk(
  vehicle: CopartVehicle,
  _logger: Logger,
): RiskAssessment {
  const factors: string[] = [];
  const warnings: string[] = [];
  let riskScore = 0;

  // Age risk (older = higher risk)
  const currentYear = new Date().getFullYear();
  const age = currentYear - vehicle.year;
  if (age > 10) {
    riskScore += 20;
    factors.push(`Vehicle is ${age} years old`);
    if (age > 15) {
      warnings.push('Very old vehicle - expect higher maintenance costs');
    }
  } else if (age > 5) {
    riskScore += 10;
    factors.push(`Vehicle is ${age} years old`);
  }

  // Mileage risk
  const mileagePerYear = vehicle.mileage / Math.max(age, 1);
  if (vehicle.mileage > 150000) {
    riskScore += 25;
    factors.push(`High mileage: ${vehicle.mileage.toLocaleString()} miles`);
    warnings.push(
      'High mileage may indicate increased wear and maintenance needs',
    );
  } else if (vehicle.mileage > 100000) {
    riskScore += 15;
    factors.push(`Moderate mileage: ${vehicle.mileage.toLocaleString()} miles`);
  }

  if (mileagePerYear > 20000) {
    riskScore += 10;
    factors.push(
      `High annual mileage: ${Math.round(mileagePerYear).toLocaleString()} miles/year`,
    );
  }

  // Damage risk
  const damageRisk = getDamageRisk(vehicle.damage);
  riskScore += damageRisk.score;
  factors.push(...damageRisk.factors);
  warnings.push(...damageRisk.warnings);

  // Make/model reliability risk
  const reliabilityRisk = getReliabilityRisk(vehicle.make, vehicle.model);
  riskScore += reliabilityRisk.score;
  factors.push(...reliabilityRisk.factors);
  warnings.push(...reliabilityRisk.warnings);

  // Market/auction specific risks
  const auctionRisk = getAuctionRisk(vehicle);
  riskScore += auctionRisk.score;
  factors.push(...auctionRisk.factors);
  warnings.push(...auctionRisk.warnings);

  // VIN-based risk (if available)
  if (vehicle.toolResults?.vinDetails) {
    const vinRisk = getVinRisk(vehicle.toolResults.vinDetails);
    riskScore += vinRisk.score;
    factors.push(...vinRisk.factors);
    warnings.push(...vinRisk.warnings);
  }

  // Determine overall risk level
  const finalScore = Math.min(100, Math.max(0, riskScore));
  let level: 'low' | 'medium' | 'high';
  if (finalScore < 30) level = 'low';
  else if (finalScore < 60) level = 'medium';
  else level = 'high';

  return {
    level,
    score: finalScore,
    factors: factors.filter((f, i, arr) => arr.indexOf(f) === i), // dedupe
    warnings: warnings.filter((w, i, arr) => arr.indexOf(w) === i), // dedupe
    confidence: 75, // Medium-high confidence in heuristic assessment
  };
}

function getDamageRisk(damage: string): {
  score: number;
  factors: string[];
  warnings: string[];
} {
  const factors: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  const normalizedDamage = damage.toLowerCase();

  if (normalizedDamage.includes('none') || normalizedDamage.includes('clean')) {
    factors.push('No reported damage');
  } else if (normalizedDamage.includes('minor')) {
    score += 5;
    factors.push('Minor damage reported');
  } else if (normalizedDamage.includes('moderate')) {
    score += 15;
    factors.push('Moderate damage reported');
    warnings.push('Moderate damage may affect reliability and resale value');
  } else if (
    normalizedDamage.includes('severe') ||
    normalizedDamage.includes('major')
  ) {
    score += 30;
    factors.push('Severe damage reported');
    warnings.push(
      'Severe damage poses significant repair costs and safety risks',
    );
  } else if (
    normalizedDamage.includes('salvage') ||
    normalizedDamage.includes('total')
  ) {
    score += 40;
    factors.push('Salvage/total loss title');
    warnings.push(
      'Salvage vehicles may have hidden damage and insurance limitations',
    );
  } else if (
    normalizedDamage.includes('flood') ||
    normalizedDamage.includes('water')
  ) {
    score += 35;
    factors.push('Flood/water damage');
    warnings.push(
      'Water damage can cause long-term electrical and mechanical issues',
    );
  } else {
    score += 10;
    factors.push(`Damage type: ${damage}`);
  }

  return { score, factors, warnings };
}

function getReliabilityRisk(
  make: string,
  model: string,
): { score: number; factors: string[]; warnings: string[] } {
  const factors: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  // Reliability rankings (simplified)
  const highReliability = ['Toyota', 'Honda', 'Lexus', 'Mazda', 'Subaru'];
  const mediumReliability = ['Nissan', 'Hyundai', 'Kia', 'Ford', 'Chevrolet'];
  const lowReliability = [
    'BMW',
    'Mercedes-Benz',
    'Audi',
    'Volkswagen',
    'Land Rover',
    'Jaguar',
  ];

  if (highReliability.includes(make)) {
    factors.push('High reliability brand');
  } else if (mediumReliability.includes(make)) {
    score += 5;
    factors.push('Medium reliability brand');
  } else if (lowReliability.includes(make)) {
    score += 15;
    factors.push('Lower reliability brand');
    warnings.push('Luxury brands often have higher maintenance costs');
  } else {
    score += 8;
    factors.push('Unknown reliability rating');
  }

  // Model-specific risks
  const problematicModels = [
    'Range Rover',
    'X5',
    'X3',
    'E-Class',
    'S-Class',
    'A4',
    'A6',
    'Q7',
  ];

  if (
    problematicModels.some((pm) =>
      model.toLowerCase().includes(pm.toLowerCase()),
    )
  ) {
    score += 10;
    warnings.push('This model has known reliability issues');
  }

  return { score, factors, warnings };
}

function getAuctionRisk(vehicle: CopartVehicle): {
  score: number;
  factors: string[];
  warnings: string[];
} {
  const factors: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  // Sale status risk
  if (vehicle.saleStatus === 'sold') {
    score += 50;
    factors.push('Vehicle already sold');
    warnings.push('Cannot bid on sold vehicle');
  } else if (vehicle.saleStatus === 'cancelled') {
    score += 30;
    factors.push('Auction cancelled');
    warnings.push('Cancelled auctions may indicate title or condition issues');
  }

  // Bid/value relationship
  if (vehicle.currentBid > vehicle.estimatedValue * 1.2) {
    score += 15;
    factors.push('Current bid exceeds estimated value by >20%');
    warnings.push('Potential overbidding situation');
  }

  // Missing information risk
  if (
    !vehicle.vin ||
    vehicle.vin === 'UNKNOWN' ||
    vehicle.vin === 'UNKNOWNVIN'
  ) {
    score += 20;
    factors.push('VIN not available');
    warnings.push('Cannot verify vehicle history without VIN');
  }

  if (!vehicle.images || vehicle.images.length === 0) {
    score += 10;
    factors.push('No images available');
    warnings.push('Cannot assess visual condition without photos');
  }

  return { score, factors, warnings };
}

function getVinRisk(vinDetails: Record<string, string>): {
  score: number;
  factors: string[];
  warnings: string[];
} {
  const factors: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  // Check for recall information
  const errorDetails = Object.entries(vinDetails).filter(
    ([key, value]) =>
      key.toLowerCase().includes('error') ||
      value.toLowerCase().includes('error'),
  );

  if (errorDetails.length > 0) {
    score += 5;
    factors.push('VIN decode errors present');
  }

  // Check for body type mismatches or unusual configurations
  const bodyType = vinDetails['Body Class'] || vinDetails['Vehicle Type'] || '';
  if (
    bodyType.toLowerCase().includes('incomplete') ||
    bodyType.toLowerCase().includes('chassis')
  ) {
    score += 25;
    factors.push('Incomplete or commercial vehicle');
    warnings.push(
      'Commercial/incomplete vehicles may have different maintenance needs',
    );
  }

  return { score, factors, warnings };
}
