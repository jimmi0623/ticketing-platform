const { getPool } = require('../config/database');
const { trackDatabaseQuery } = require('../middleware/monitoring');
const logger = require('../config/logger');

class QueryOptimizer {
  constructor() {
    this.queryCache = new Map();
    this.preparedStatements = new Map();
    this.queryStats = new Map();
  }

  // Enhanced query execution with monitoring and caching
  async execute(query, params = [], options = {}) {
    const startTime = Date.now();
    const pool = getPool();
    
    try {
      // Generate query fingerprint for statistics
      const fingerprint = this.generateQueryFingerprint(query);
      
      // Use prepared statement if available
      const result = await pool.execute(query, params);
      
      const duration = Date.now() - startTime;
      
      // Update query statistics
      this.updateQueryStats(fingerprint, duration);
      
      // Track for monitoring
      trackDatabaseQuery(query, duration, {
        params: params.length,
        fingerprint,
        rows: result[0]?.length || 0
      });
      
      // Log slow queries
      if (duration > 1000) {
        logger.warn(`Slow query detected (${duration}ms): ${query.substring(0, 200)}`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Query execution error:', {
        error: error.message,
        query: query.substring(0, 200),
        duration,
        params: params.length
      });
      throw error;
    }
  }

  // Query analysis and optimization suggestions
  async analyzeQuery(query, params = []) {
    const pool = getPool();
    
    try {
      // Use EXPLAIN to analyze query
      const explainQuery = `EXPLAIN ${query}`;
      const [rows] = await pool.execute(explainQuery, params);
      
      const analysis = {
        explained: rows,
        suggestions: [],
        warnings: [],
        estimatedCost: 0
      };
      
      // Analyze EXPLAIN output
      for (const row of rows) {
        // Check for full table scans
        if (row.type === 'ALL') {
          analysis.warnings.push(`Full table scan on ${row.table}`);
          analysis.suggestions.push(`Consider adding an index on ${row.table}`);
        }
        
        // Check for temporary tables
        if (row.Extra && row.Extra.includes('Using temporary')) {
          analysis.warnings.push('Using temporary table');
          analysis.suggestions.push('Consider optimizing JOIN conditions or ORDER BY');
        }
        
        // Check for filesort
        if (row.Extra && row.Extra.includes('Using filesort')) {
          analysis.warnings.push('Using filesort');
          analysis.suggestions.push('Consider adding appropriate indexes for sorting');
        }
        
        // Estimate cost (simplified)
        analysis.estimatedCost += row.rows || 0;
      }
      
      // Additional checks based on query patterns
      this.addPatternBasedSuggestions(query, analysis);
      
      return analysis;
    } catch (error) {
      logger.error('Query analysis error:', error);
      throw error;
    }
  }

  // Generate query fingerprint for caching and statistics
  generateQueryFingerprint(query) {
    // Normalize query by removing literals and whitespace
    return query
      .replace(/\s+/g, ' ')
      .replace(/'[^']*'/g, "'?'")
      .replace(/\d+/g, '?')
      .trim()
      .toLowerCase();
  }

  // Update query performance statistics
  updateQueryStats(fingerprint, duration) {
    if (!this.queryStats.has(fingerprint)) {
      this.queryStats.set(fingerprint, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0,
        fingerprint
      });
    }
    
    const stats = this.queryStats.get(fingerprint);
    stats.count++;
    stats.totalTime += duration;
    stats.avgTime = Math.round(stats.totalTime / stats.count);
    stats.minTime = Math.min(stats.minTime, duration);
    stats.maxTime = Math.max(stats.maxTime, duration);
  }

  // Add pattern-based optimization suggestions
  addPatternBasedSuggestions(query, analysis) {
    const lowerQuery = query.toLowerCase();
    
    // Check for N+1 query patterns
    if (lowerQuery.includes('select') && lowerQuery.includes('where')) {
      if (lowerQuery.match(/select.*from.*where.*id\s*=\s*\?/)) {
        analysis.suggestions.push('Consider using JOIN instead of multiple SELECT queries');
      }
    }
    
    // Check for missing LIMIT on large tables
    if (lowerQuery.includes('from events') || lowerQuery.includes('from orders')) {
      if (!lowerQuery.includes('limit')) {
        analysis.warnings.push('Query on large table without LIMIT');
        analysis.suggestions.push('Consider adding LIMIT clause for pagination');
      }
    }
    
    // Check for inefficient LIKE patterns
    if (lowerQuery.includes("like '%")) {
      analysis.warnings.push('Leading wildcard in LIKE pattern');
      analysis.suggestions.push('Consider full-text search for better performance');
    }
    
    // Check for multiple JOINs without proper indexing
    const joinCount = (lowerQuery.match(/join/g) || []).length;
    if (joinCount > 3) {
      analysis.warnings.push('Complex query with multiple JOINs');
      analysis.suggestions.push('Verify all JOIN conditions have proper indexes');
    }
  }

  // Connection pool monitoring
  async getConnectionStats() {
    const pool = getPool();
    
    return {
      activeConnections: pool.pool._allConnections.length,
      freeConnections: pool.pool._freeConnections.length,
      queuedRequests: pool.pool._connectionQueue.length,
      totalConnections: pool.pool.config.connectionLimit
    };
  }

  // Get query performance statistics
  getQueryStats() {
    const stats = Array.from(this.queryStats.values())
      .sort((a, b) => b.totalTime - a.totalTime) // Sort by total time
      .slice(0, 20); // Top 20 queries
    
    return {
      topQueries: stats,
      totalQueries: Array.from(this.queryStats.values())
        .reduce((sum, stat) => sum + stat.count, 0),
      totalTime: Array.from(this.queryStats.values())
        .reduce((sum, stat) => sum + stat.totalTime, 0)
    };
  }

  // Database health check with performance metrics
  async healthCheck() {
    const issues = [];
    const metrics = {};
    
    try {
      const pool = getPool();
      
      // Test basic connectivity
      const startTime = Date.now();
      await pool.execute('SELECT 1');
      metrics.connectionTime = Date.now() - startTime;
      
      if (metrics.connectionTime > 1000) {
        issues.push('Slow database connection');
      }
      
      // Check connection pool status
      const connStats = await this.getConnectionStats();
      metrics.connections = connStats;
      
      if (connStats.freeConnections === 0) {
        issues.push('No free database connections');
      }
      
      // Check for slow queries in the last hour
      const queryStats = this.getQueryStats();
      const slowQueries = queryStats.topQueries.filter(q => q.avgTime > 5000);
      
      if (slowQueries.length > 0) {
        issues.push(`${slowQueries.length} slow queries detected`);
      }
      
      metrics.queries = queryStats;
      
      // Check database size and growth
      const [dbSize] = await pool.execute(`
        SELECT 
          table_schema as 'database',
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as 'size_mb'
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        GROUP BY table_schema
      `);
      
      metrics.databaseSize = dbSize[0];
      
    } catch (error) {
      issues.push(`Database error: ${error.message}`);
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      metrics
    };
  }

  // Index optimization suggestions
  async suggestIndexes() {
    const pool = getPool();
    const suggestions = [];
    
    try {
      // Analyze slow query log if available
      const slowQueries = Array.from(this.queryStats.values())
        .filter(stat => stat.avgTime > 1000)
        .sort((a, b) => b.totalTime - a.totalTime);
      
      for (const queryStats of slowQueries.slice(0, 5)) {
        const analysis = await this.analyzeQuery(queryStats.fingerprint);
        suggestions.push({
          query: queryStats.fingerprint,
          avgTime: queryStats.avgTime,
          count: queryStats.count,
          suggestions: analysis.suggestions,
          warnings: analysis.warnings
        });
      }
      
      // Check for missing indexes on foreign keys
      const [foreignKeys] = await pool.execute(`
        SELECT 
          TABLE_NAME,
          COLUMN_NAME,
          CONSTRAINT_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
          AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      
      for (const fk of foreignKeys) {
        // Check if there's an index on the foreign key column
        const [indexes] = await pool.execute(`
          SELECT COUNT(*) as index_count
          FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
            AND COLUMN_NAME = ?
        `, [fk.TABLE_NAME, fk.COLUMN_NAME]);
        
        if (indexes[0].index_count === 0) {
          suggestions.push({
            type: 'missing_fk_index',
            table: fk.TABLE_NAME,
            column: fk.COLUMN_NAME,
            suggestion: `CREATE INDEX idx_${fk.TABLE_NAME}_${fk.COLUMN_NAME} ON ${fk.TABLE_NAME} (${fk.COLUMN_NAME})`
          });
        }
      }
      
    } catch (error) {
      logger.error('Index suggestion error:', error);
    }
    
    return suggestions;
  }

  // Query plan caching for repeated queries
  async getCachedPlan(query) {
    const fingerprint = this.generateQueryFingerprint(query);
    return this.queryCache.get(fingerprint);
  }

  async cachePlan(query, plan) {
    const fingerprint = this.generateQueryFingerprint(query);
    this.queryCache.set(fingerprint, {
      plan,
      cachedAt: Date.now(),
      hits: 0
    });
    
    // Limit cache size
    if (this.queryCache.size > 1000) {
      const oldestKey = this.queryCache.keys().next().value;
      this.queryCache.delete(oldestKey);
    }
  }
}

// Create singleton instance
const queryOptimizer = new QueryOptimizer();

// Enhanced database middleware with optimization
const dbMiddleware = () => {
  return async (req, res, next) => {
    // Add query optimizer to request
    req.db = {
      execute: async (query, params, options) => {
        return await queryOptimizer.execute(query, params, options);
      },
      analyze: async (query, params) => {
        return await queryOptimizer.analyzeQuery(query, params);
      }
    };
    
    next();
  };
};

module.exports = {
  queryOptimizer,
  dbMiddleware
};