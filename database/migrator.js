const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class DatabaseMigrator {
  constructor(databaseUrl) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false,
      } : false,
    });
  }

  async createMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    try {
      await this.pool.query(query);
      console.log('✅ Migrations table created/verified');
    } catch (error) {
      console.error('❌ Failed to create migrations table:', error);
      throw error;
    }
  }

  async getExecutedMigrations() {
    try {
      const result = await this.pool.query('SELECT filename FROM migrations ORDER BY id');
      return result.rows.map(row => row.filename);
    } catch (error) {
      console.error('❌ Failed to get executed migrations:', error);
      return [];
    }
  }

  async executeMigration(filename, content) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Execute the migration SQL
      await client.query(content);
      
      // Record the migration as executed
      await client.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [filename]
      );
      
      await client.query('COMMIT');
      console.log(`✅ Migration ${filename} executed successfully`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Migration ${filename} failed:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async runMigrations() {
    console.log('🚀 Starting database migrations...');
    
    try {
      await this.createMigrationsTable();
      
      const migrationsDir = path.join(__dirname, 'migrations');
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      const executedMigrations = await this.getExecutedMigrations();
      
      for (const filename of migrationFiles) {
        if (executedMigrations.includes(filename)) {
          console.log(`⏭️  Skipping already executed migration: ${filename}`);
          continue;
        }
        
        console.log(`🔄 Executing migration: ${filename}`);
        const filePath = path.join(migrationsDir, filename);
        const content = fs.readFileSync(filePath, 'utf8');
        
        await this.executeMigration(filename, content);
      }
      
      console.log('✅ All migrations completed successfully');
      
    } catch (error) {
      console.error('❌ Migration process failed:', error);
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = DatabaseMigrator;

// CLI usage
if (require.main === module) {
  const migrator = new DatabaseMigrator(process.env.DATABASE_URL);
  
  migrator.runMigrations()
    .then(() => {
      console.log('🎉 Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration process failed:', error);
      process.exit(1);
    })
    .finally(() => {
      migrator.close();
    });
}