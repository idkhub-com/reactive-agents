/**
 * Centralized tool interface for the auction agent
 */

import type { Logger } from 'pino';
import type { CopartVehicle } from '../copart';
import { getMarketComps, type MarketComparison } from './market-comps';
import { assessRisk, type RiskAssessment } from './risk-assessment';
import { decodeVin, type VinDetails } from './vin-decode';

export interface ToolResults {
  vinDetails?: VinDetails;
  marketComps?: MarketComparison;
  riskAssessment?: RiskAssessment;
}

export interface ToolConfig {
  enableVinDecode: boolean;
  enableMarketComps: boolean;
  enableRiskAssessment: boolean;
  toolTimeoutMs: number;
}

/**
 * Run all enabled tools on a vehicle and return enriched data
 */
export async function runTools(
  vehicle: CopartVehicle,
  config: ToolConfig,
  logger: Logger,
): Promise<ToolResults> {
  const results: ToolResults = {};
  const promises: Promise<void>[] = [];

  // VIN decode tool
  if (config.enableVinDecode) {
    promises.push(
      runWithTimeout(
        () => decodeVin(vehicle.vin, logger),
        config.toolTimeoutMs,
        'VIN decode',
      )
        .then((result) => {
          if (result) results.vinDetails = result;
        })
        .catch((err) => {
          logger.warn({ err, vehicleId: vehicle.id }, 'VIN decode tool failed');
        }),
    );
  }

  // Market comparison tool
  if (config.enableMarketComps) {
    promises.push(
      runWithTimeout(
        () => getMarketComps(vehicle, logger),
        config.toolTimeoutMs,
        'Market comps',
      )
        .then((result) => {
          if (result) results.marketComps = result;
        })
        .catch((err) => {
          logger.warn(
            { err, vehicleId: vehicle.id },
            'Market comps tool failed',
          );
        }),
    );
  }

  // Risk assessment tool
  if (config.enableRiskAssessment) {
    promises.push(
      runWithTimeout(
        () => Promise.resolve(assessRisk(vehicle, logger)),
        config.toolTimeoutMs,
        'Risk assessment',
      )
        .then((result) => {
          if (result) results.riskAssessment = result;
        })
        .catch((err) => {
          logger.warn(
            { err, vehicleId: vehicle.id },
            'Risk assessment tool failed',
          );
        }),
    );
  }

  // Run all tools in parallel
  await Promise.allSettled(promises);

  return results;
}

function runWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  toolName: string,
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`${toolName} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    ),
  );

  return Promise.race([fn(), timeoutPromise]);
}

export * from './market-comps';
export * from './risk-assessment';
export * from './vin-decode';
