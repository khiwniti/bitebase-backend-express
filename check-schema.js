const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/bitebase_dev',
  ssl: false
});

async function checkSchema() {
  try {
    console.log('Checking restaurants table schema...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current restaurants table columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check if address column exists
    const addressExists = result.rows.some(row => row.column_name === 'address');
    console.log(`\nAddress column exists: ${addressExists}`);
    
    if (!addressExists) {
      console.log('Adding missing address column...');
      await pool.query(`
        ALTER TABLE restaurants 
        ADD COLUMN address JSONB DEFAULT '{}'::jsonb
      `);
      console.log('✅ Address column added successfully');
    }
    
  } catch (error) {
    console.error('❌ Schema check error:', error);
  } finally {
    await pool.end();
  }
}

checkSchema();