const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database initialization script
async function initializeDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🚀 Initializing BiteBase database...');

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schema
      .split(';')
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');

    for (const statement of statements) {
      try {
        await pool.query(statement);
        console.log('✅ Executed:', statement.substring(0, 50) + '...');
      } catch (error) {
        console.error('❌ Failed to execute statement:', error.message);
        console.error('Statement:', statement.substring(0, 100) + '...');
      }
    }

    // Insert sample data for demo
    if (process.env.INSERT_SAMPLE_DATA === 'true') {
      console.log('📊 Inserting sample data...');
      await insertSampleData(pool);
    }

    console.log('✅ Database initialization complete!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function insertSampleData(pool) {
  // Insert sample restaurant
  const restaurantResult = await pool.query(`
    INSERT INTO restaurants (
      place_id, name, lat, lng, location, rating, 
      user_ratings_total, price_level, types, vicinity, 
      business_status, phone, website
    ) VALUES (
      'sample_restaurant_1',
      'BiteBase Demo Restaurant',
      40.7128,
      -74.0060,
      ST_MakePoint(-74.0060, 40.7128)::geography,
      4.5,
      1234,
      2,
      '["restaurant", "food", "establishment"]'::jsonb,
      '123 Main St, New York, NY 10001',
      'OPERATIONAL',
      '+1-212-555-0123',
      'https://demo.bitebase.com'
    ) RETURNING id
  `);

  const restaurantId = restaurantResult.rows[0].id;
  console.log('✅ Created demo restaurant:', restaurantId);

  // Insert sample menu items
  const categories = ['Appetizers', 'Main Courses', 'Desserts', 'Beverages'];
  const items = [
    { name: 'Caesar Salad', category: 'Appetizers', price: 12.99, cost: 4.50 },
    { name: 'Bruschetta', category: 'Appetizers', price: 10.99, cost: 3.50 },
    { name: 'Grilled Salmon', category: 'Main Courses', price: 28.99, cost: 12.00 },
    { name: 'Ribeye Steak', category: 'Main Courses', price: 45.99, cost: 20.00 },
    { name: 'Pasta Carbonara', category: 'Main Courses', price: 22.99, cost: 8.00 },
    { name: 'Tiramisu', category: 'Desserts', price: 8.99, cost: 3.00 },
    { name: 'Cheesecake', category: 'Desserts', price: 9.99, cost: 3.50 },
    { name: 'House Wine', category: 'Beverages', price: 8.00, cost: 3.00 },
    { name: 'Craft Beer', category: 'Beverages', price: 7.00, cost: 2.50 },
    { name: 'Espresso', category: 'Beverages', price: 3.50, cost: 0.50 }
  ];

  const itemIds = [];
  for (const item of items) {
    const result = await pool.query(`
      INSERT INTO items (
        restaurant_id, item_name, category, price, cost, 
        description, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id
    `, [
      restaurantId,
      item.name,
      item.category,
      item.price,
      item.cost,
      `Delicious ${item.name} made with fresh ingredients`
    ]);
    itemIds.push({ id: result.rows[0].id, ...item });
  }
  console.log('✅ Created menu items:', items.length);

  // Insert sample customers
  const customers = [];
  for (let i = 1; i <= 100; i++) {
    const result = await pool.query(`
      INSERT INTO customers (
        restaurant_id, email, phone, first_name, last_name,
        loyalty_points, total_spent, visit_count, 
        first_visit_date, last_visit_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 
        CURRENT_DATE - INTERVAL '${Math.floor(Math.random() * 365)} days',
        CURRENT_DATE - INTERVAL '${Math.floor(Math.random() * 30)} days'
      ) RETURNING id
    `, [
      restaurantId,
      `customer${i}@example.com`,
      `+1-212-555-${String(i).padStart(4, '0')}`,
      `Customer${i}`,
      `Demo${i}`,
      Math.floor(Math.random() * 1000),
      Math.floor(Math.random() * 5000),
      Math.floor(Math.random() * 50) + 1
    ]);
    customers.push(result.rows[0].id);
  }
  console.log('✅ Created customers:', customers.length);

  // Insert sample transactions for the last 90 days
  const now = new Date();
  let transactionCount = 0;
  
  for (let daysAgo = 90; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    
    // Generate 50-150 transactions per day
    const dailyTransactions = Math.floor(Math.random() * 100) + 50;
    
    for (let t = 0; t < dailyTransactions; t++) {
      const customerId = customers[Math.floor(Math.random() * customers.length)];
      const hour = Math.floor(Math.random() * 14) + 10; // 10 AM to 11 PM
      const minute = Math.floor(Math.random() * 60);
      
      date.setHours(hour, minute, 0, 0);
      
      // Create transaction
      const transactionResult = await pool.query(`
        INSERT INTO sales_transactions (
          restaurant_id, transaction_date, customer_id,
          total_amount, tax_amount, tip_amount,
          payment_method, order_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
      `, [
        restaurantId,
        date,
        customerId,
        Math.floor(Math.random() * 150) + 20, // $20-$170
        Math.floor(Math.random() * 15) + 2,   // $2-$17 tax
        Math.floor(Math.random() * 30) + 5,   // $5-$35 tip
        ['credit', 'debit', 'cash', 'mobile'][Math.floor(Math.random() * 4)],
        ['dine-in', 'takeout', 'delivery'][Math.floor(Math.random() * 3)]
      ]);
      
      const transactionId = transactionResult.rows[0].id;
      
      // Add 1-5 items to each order
      const itemCount = Math.floor(Math.random() * 4) + 1;
      for (let i = 0; i < itemCount; i++) {
        const item = itemIds[Math.floor(Math.random() * itemIds.length)];
        await pool.query(`
          INSERT INTO order_items (
            transaction_id, item_id, quantity, price
          ) VALUES ($1, $2, $3, $4)
        `, [
          transactionId,
          item.id,
          Math.floor(Math.random() * 3) + 1,
          item.price
        ]);
      }
      
      transactionCount++;
    }
  }
  console.log('✅ Created transactions:', transactionCount);

  // Insert sample inventory
  const inventoryItems = [
    'Chicken Breast', 'Salmon Fillet', 'Ribeye Steak', 'Pasta',
    'Tomatoes', 'Lettuce', 'Cheese', 'Wine Bottles', 'Beer Kegs'
  ];
  
  for (const item of inventoryItems) {
    await pool.query(`
      INSERT INTO inventory (
        restaurant_id, item_name, category, unit,
        current_quantity, min_quantity, max_quantity,
        unit_cost, supplier
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      restaurantId,
      item,
      'Food & Beverage',
      item.includes('Wine') || item.includes('Beer') ? 'units' : 'lbs',
      Math.floor(Math.random() * 100) + 20,
      10,
      200,
      Math.floor(Math.random() * 20) + 5,
      'Premium Food Suppliers Inc.'
    ]);
  }
  console.log('✅ Created inventory items:', inventoryItems.length);

  // Insert sample staff
  const roles = ['Manager', 'Chef', 'Server', 'Host', 'Bartender'];
  for (let i = 1; i <= 20; i++) {
    await pool.query(`
      INSERT INTO staff (
        restaurant_id, employee_id, first_name, last_name,
        role, department, hire_date, hourly_rate,
        phone, email, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
    `, [
      restaurantId,
      `EMP${String(i).padStart(3, '0')}`,
      `Employee${i}`,
      `Staff${i}`,
      roles[Math.floor(Math.random() * roles.length)],
      'Operations',
      new Date(now.getFullYear() - Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), 1),
      Math.floor(Math.random() * 20) + 15, // $15-$35/hour
      `+1-212-555-${String(1000 + i).padStart(4, '0')}`,
      `employee${i}@bitebase.com`
    ]);
  }
  console.log('✅ Created staff members: 20');

  // Insert sample reviews
  const sentiments = ['positive', 'neutral', 'negative'];
  const reviewTexts = {
    positive: [
      'Amazing food and excellent service!',
      'Best restaurant in the area, highly recommend!',
      'The chef really knows what they\'re doing. Fantastic meal!'
    ],
    neutral: [
      'Good food, average service.',
      'Nice place, but nothing special.',
      'Decent meal, fair prices.'
    ],
    negative: [
      'Disappointed with the service.',
      'Food was cold and overpriced.',
      'Won\'t be coming back, unfortunately.'
    ]
  };

  for (let i = 0; i < 50; i++) {
    const sentiment = sentiments[Math.floor(Math.random() * 3)];
    const rating = sentiment === 'positive' ? 4 + Math.random() : 
                   sentiment === 'neutral' ? 3 + Math.random() : 
                   1 + Math.random() * 2;
    
    await pool.query(`
      INSERT INTO reviews (
        restaurant_id, source, external_id, rating,
        review_text, reviewer_name, review_date,
        sentiment_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      restaurantId,
      ['google', 'yelp', 'tripadvisor'][Math.floor(Math.random() * 3)],
      `review_${Date.now()}_${i}`,
      Math.round(rating),
      reviewTexts[sentiment][Math.floor(Math.random() * 3)],
      `Reviewer ${i + 1}`,
      new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Last 90 days
      sentiment === 'positive' ? 0.8 : sentiment === 'neutral' ? 0 : -0.8
    ]);
  }
  console.log('✅ Created reviews: 50');

  console.log('✅ Sample data insertion complete!');
}

// Run initialization if called directly
if (require.main === module) {
  require('dotenv').config();
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };