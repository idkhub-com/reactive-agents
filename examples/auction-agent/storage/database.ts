import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Logger } from 'pino';
import type { AuctionAnalysis, CopartVehicle, SearchCriteria } from '../copart';

export interface StoredRun {
  id: string;
  created_at: string;
  search_criteria: SearchCriteria;
  scraper_mode: 'mock' | 'real';
  vehicle_count: number;
  analysis_count: number;
  llm_count: number;
  status: 'running' | 'completed' | 'failed';
  error_message?: string;
  duration_ms?: number;
  export_path?: string;
}

export interface StoredVehicle extends Omit<CopartVehicle, 'toolResults'> {
  tool_results?: string; // JSON serialized
  first_seen: string;
  last_updated: string;
  seen_count: number;
}

export interface StoredAnalysis {
  id: string;
  run_id: string;
  vehicle_id: string;
  created_at: string;
  score: number;
  reasoning: string;
  recommendation: 'buy' | 'monitor' | 'pass';
  market_average_price?: number;
  market_price_difference?: number;
  market_trend?: 'above' | 'below' | 'average';
  risk_level?: 'low' | 'medium' | 'high';
  risk_score?: number;
  risk_factors?: string; // JSON array
  analysis_type: 'llm' | 'heuristic';
  model_used?: string;
}

// Database row type for runs table
interface RunRow {
  id: string;
  created_at: string;
  search_criteria: string; // JSON string
  scraper_mode: 'mock' | 'real';
  vehicle_count: number;
  analysis_count: number;
  llm_count: number;
  status: 'running' | 'completed' | 'failed';
  error_message?: string;
  duration_ms?: number;
  export_path?: string;
}

// Database row type for analyses table
interface AnalysisRow {
  id: string;
  run_id: string;
  vehicle_id: string;
  created_at: string;
  score: number;
  reasoning: string;
  recommendation: 'buy' | 'monitor' | 'pass';
  market_average_price?: number;
  market_price_difference?: number;
  market_trend?: 'above' | 'below' | 'average';
  risk_level?: 'low' | 'medium' | 'high';
  risk_score?: number;
  risk_factors?: string; // JSON array
  analysis_type: 'llm' | 'heuristic';
  model_used?: string;
}

// Database row type for run_summary view
interface RunSummaryRow {
  id: string;
  created_at: string;
  search_criteria: string; // JSON string
  scraper_mode: 'mock' | 'real';
  vehicle_count: number;
  analysis_count: number;
  llm_count: number;
  status: 'running' | 'completed' | 'failed';
  error_message?: string;
  duration_ms?: number;
  export_path?: string;
  actual_vehicle_count: number;
  actual_analysis_count: number;
  avg_score?: number;
  buy_recommendations: number;
}

export class AuctionDatabase {
  private db: Database.Database;
  private logger: Logger;

  constructor(dbPath: string, logger: Logger) {
    this.logger = logger;
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    try {
      const schemaPath = join(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf8');
      this.db.exec(schema);
      this.logger.info('Database schema initialized');
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to initialize database schema');
      throw error;
    }
  }

  // Run management
  startRun(criteria: SearchCriteria, scraperMode: 'mock' | 'real'): string {
    const runId = generateRunId();
    const stmt = this.db.prepare(`
      INSERT INTO runs (id, search_criteria, scraper_mode, status)
      VALUES (?, ?, ?, 'running')
    `);

    stmt.run(runId, JSON.stringify(criteria), scraperMode);
    this.logger.info({ runId }, 'Started new run');
    return runId;
  }

  completeRun(
    runId: string,
    vehicleCount: number,
    analysisCount: number,
    llmCount: number,
    exportPath?: string,
    durationMs?: number,
  ): void {
    const stmt = this.db.prepare(`
      UPDATE runs 
      SET status = 'completed', 
          vehicle_count = ?, 
          analysis_count = ?, 
          llm_count = ?,
          export_path = ?,
          duration_ms = ?
      WHERE id = ?
    `);

    stmt.run(
      vehicleCount,
      analysisCount,
      llmCount,
      exportPath,
      durationMs,
      runId,
    );
    this.logger.info({ runId, vehicleCount, analysisCount }, 'Completed run');
  }

  failRun(runId: string, errorMessage: string): void {
    const stmt = this.db.prepare(`
      UPDATE runs 
      SET status = 'failed', error_message = ?
      WHERE id = ?
    `);

    stmt.run(errorMessage, runId);
    this.logger.warn({ runId, errorMessage }, 'Failed run');
  }

  // Vehicle management with deduplication
  upsertVehicles(runId: string, vehicles: CopartVehicle[]): string[] {
    const vehicleIds: string[] = [];

    const upsertVehicle = this.db.prepare(`
      INSERT INTO vehicles (
        id, vin, title, year, make, model, mileage, damage, location, description,
        sale_status, images, current_bid, estimated_value, auction_end_time, 
        lot_number, tool_results, first_seen, last_updated, seen_count
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1
      )
      ON CONFLICT(lot_number, vin) DO UPDATE SET
        title = excluded.title,
        current_bid = excluded.current_bid,
        estimated_value = excluded.estimated_value,
        auction_end_time = excluded.auction_end_time,
        sale_status = excluded.sale_status,
        tool_results = excluded.tool_results,
        last_updated = datetime('now'),
        seen_count = seen_count + 1
    `);

    const linkRunVehicle = this.db.prepare(`
      INSERT OR IGNORE INTO run_vehicles (run_id, vehicle_id)
      VALUES (?, ?)
    `);

    const transaction = this.db.transaction((vehicles: CopartVehicle[]) => {
      for (const vehicle of vehicles) {
        const vehicleId = vehicle.lotNumber || vehicle.id;

        upsertVehicle.run(
          vehicleId,
          vehicle.vin,
          vehicle.title,
          vehicle.year,
          vehicle.make,
          vehicle.model,
          vehicle.mileage,
          vehicle.damage,
          vehicle.location,
          vehicle.description,
          vehicle.saleStatus,
          JSON.stringify(vehicle.images),
          vehicle.currentBid,
          vehicle.estimatedValue,
          vehicle.auctionEndTime,
          vehicle.lotNumber,
          vehicle.toolResults ? JSON.stringify(vehicle.toolResults) : null,
        );

        linkRunVehicle.run(runId, vehicleId);
        vehicleIds.push(vehicleId);
      }
    });

    transaction(vehicles);
    this.logger.info({ runId, count: vehicles.length }, 'Upserted vehicles');
    return vehicleIds;
  }

  // Analysis storage
  storeAnalyses(
    runId: string,
    analyses: AuctionAnalysis[],
    analysisType: 'llm' | 'heuristic',
    modelUsed?: string,
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO analyses (
        id, run_id, vehicle_id, score, reasoning, recommendation,
        market_average_price, market_price_difference, market_trend,
        risk_level, risk_score, risk_factors, analysis_type, model_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((analyses: AuctionAnalysis[]) => {
      for (const analysis of analyses) {
        const analysisId = generateAnalysisId();
        const vehicleId = analysis.vehicle.lotNumber || analysis.vehicle.id;

        stmt.run(
          analysisId,
          runId,
          vehicleId,
          analysis.score,
          analysis.reasoning,
          analysis.recommendation,
          analysis.marketComparison.averagePrice,
          analysis.marketComparison.priceDifference,
          analysis.marketComparison.marketTrend,
          analysis.riskAssessment.level,
          analysis.vehicle.toolResults?.riskAssessment?.score,
          JSON.stringify(analysis.riskAssessment.factors),
          analysisType,
          modelUsed,
        );
      }
    });

    transaction(analyses);
    this.logger.info(
      { runId, count: analyses.length, analysisType },
      'Stored analyses',
    );
  }

  // Query methods
  getRecentRuns(limit = 10): StoredRun[] {
    const stmt = this.db.prepare(`
      SELECT * FROM run_summary 
      ORDER BY created_at DESC 
      LIMIT ?
    `);

    return (stmt.all(limit) as RunSummaryRow[]).map((row) => ({
      ...row,
      search_criteria: JSON.parse(row.search_criteria),
    }));
  }

  getRunById(runId: string): StoredRun | null {
    const stmt = this.db.prepare(`
      SELECT * FROM runs WHERE id = ?
    `);

    const row = stmt.get(runId) as RunRow | undefined;
    if (!row) return null;

    return {
      ...row,
      search_criteria: JSON.parse(row.search_criteria),
    };
  }

  getVehicleHistory(vehicleId: string): StoredAnalysis[] {
    const stmt = this.db.prepare(`
      SELECT * FROM analyses 
      WHERE vehicle_id = ? 
      ORDER BY created_at DESC
    `);

    return stmt.all(vehicleId) as AnalysisRow[];
  }

  getTopPerformers(limit = 20): Record<string, unknown>[] {
    const stmt = this.db.prepare(`
      SELECT v.*, a.score, a.recommendation, a.analysis_date
      FROM latest_vehicle_analyses a
      JOIN vehicles v ON a.id = v.id
      WHERE a.recommendation = 'buy'
      ORDER BY a.score DESC
      LIMIT ?
    `);

    return stmt.all(limit) as Record<string, unknown>[];
  }

  getPriceAlerts(maxPriceDrop: number): Record<string, unknown>[] {
    const stmt = this.db.prepare(`
      SELECT v.*, a.score, a.recommendation
      FROM vehicles v
      JOIN latest_vehicle_analyses a ON v.id = a.id
      WHERE a.market_price_difference > ?
      ORDER BY a.market_price_difference DESC
    `);

    return stmt.all(maxPriceDrop) as Record<string, unknown>[];
  }

  // Cleanup old data
  cleanupOldRuns(daysToKeep = 30): number {
    const stmt = this.db.prepare(`
      DELETE FROM runs 
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `);

    const result = stmt.run(daysToKeep);
    this.logger.info(
      { deletedCount: result.changes, daysToKeep },
      'Cleaned up old runs',
    );
    return result.changes;
  }

  close(): void {
    this.db.close();
  }
}

function generateRunId(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = Math.random().toString(36).slice(2, 8);
  return `run-${timestamp}-${random}`;
}

function generateAnalysisId(): string {
  return `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
