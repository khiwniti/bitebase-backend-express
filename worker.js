/**
 * Cloudflare Worker entry point for BiteBase Backend
 * Simplified version without Express.js dependencies
 */

// Database helper functions
function generateId() {
  return crypto.randomUUID();
}

// Distance calculation using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Language detection for natural responses
function detectLanguage(text) {
  const thaiPattern = /[\u0E00-\u0E7F]/;
  const thaiWords = ['สวัสดี', 'ครับ', 'ค่ะ', 'ขอบคุณ', 'ร้าน', 'อาหาร', 'ลูกค้า', 'รายได้', 'ยอดขาย'];
  
  if (thaiPattern.test(text)) return 'th';
  
  const lowerText = text.toLowerCase();
  const hasThaiWords = thaiWords.some(word => lowerText.includes(word));
  
  return hasThaiWords ? 'th' : 'en';
}

// Intent detection for contextual responses
function determineIntent(message) {
  const lowerMessage = message.toLowerCase().trim();

  // Greetings
  if (lowerMessage === 'สวัสดี' || lowerMessage === 'hello' || lowerMessage === 'hi' ||
      lowerMessage === 'hey' || lowerMessage === 'สวัสดีครับ' || lowerMessage === 'สวัสดีค่ะ') {
    return 'greeting';
  }

  // Business questions
  if (lowerMessage.includes('sales') || lowerMessage.includes('revenue') ||
      lowerMessage.includes('รายได้') || lowerMessage.includes('ยอดขาย')) {
    return 'sales_analysis';
  }

  if (lowerMessage.includes('customer') || lowerMessage.includes('ลูกค้า')) {
    return 'customer_analysis';
  }

  if (lowerMessage.includes('marketing') || lowerMessage.includes('การตลาด')) {
    return 'marketing_advice';
  }

  return 'general_help';
}

// Generate human-like responses with personality
function generateHumanLikeResponse(message, language, intent) {
  if (language === 'th') {
    return generateThaiResponse(message, intent);
  } else {
    return generateEnglishResponse(message, intent);
  }
}

// Natural Thai responses with personality
function generateThaiResponse(message, intent) {
  switch (intent) {
    case 'greeting':
      return {
        content: `สวัสดีครับ! ผมอเล็กซ์ครับ ยินดีที่ได้รู้จักนะครับ!

ผมเป็นที่ปรึกษาธุรกิจร้านอาหารที่มีประสบการณ์มากว่า 15 ปีแล้วครับ ผมรู้ดีว่าการทำธุรกิจร้านอาหารมันไม่ง่าย แต่ผมพร้อมช่วยให้คุณประสบความสำเร็จครับ!

ความสามารถพิเศษของผม:
• การวิเคราะห์รายได้เชิงลึก
• กลยุทธ์การตลาดที่ได้ผลจริง
• การวิเคราะห์คู่แข่งแบบเรียลไทม์
• ความเข้าใจลูกค้าลึกซึ้ง
• การพยากรณ์อนาคต
• คำแนะนำอัจฉริยะ

เล่าให้ผมฟังหน่อยครับว่าวันนี้มีอะไรที่อยากปรึกษา? ผมพร้อมวิเคราะห์และให้คำแนะนำที่แม่นยำครับ!`,
        suggestions: ['วิเคราะห์รายได้ร้าน', 'แนะนำกลยุทธ์การตลาด', 'พยากรณ์อนาคตธุรกิจ']
      };

    case 'sales_analysis':
      return {
        content: `เยี่ยมมาก! คำถามเรื่องรายได้และยอดขายนี่สำคัญมากเลยครับ

จากประสบการณ์ที่ผมช่วยร้านอาหารมาเยอะ การวิเคราะห์รายได้ที่ดีต้องดูหลายมิติครับ:

มิติรายได้หลัก:
• รายได้รายวัน/สัปดาห์/เดือน
• ค่าเฉลี่ยต่อลูกค้า (Average Order Value)
• จำนวนลูกค้าต่อวัน
• เมนูที่ขายดีที่สุด

การเพิ่มยอดขาย:
• ปรับเมนูให้น่าสนใจมากขึ้น
• โปรโมชั่นที่เหมาะสมกับช่วงเวลา
• ปรับปรุงการบริการ
• ใช้ Social Media ให้เป็นประโยชน์

อยากให้ผมช่วยวิเคราะห์ข้อมูลร้านของคุณเพิ่มเติมไหมครับ?`,
        suggestions: ['ดูข้อมูลรายได้รายเดือน', 'วิเคราะห์เมนูขายดี', 'แนะนำโปรโมชั่น']
      };

    case 'customer_analysis':
      return {
        content: `ดีมากเลยครับ! การเข้าใจลูกค้าคือกุญแจสำคัญของความสำเร็จ

จากที่ผมเห็นมาหลายร้าน ลูกค้าแต่ละกลุ่มมีพฤติกรรมไม่เหมือนกันครับ:

ประเภทลูกค้าหลัก:
• ลูกค้าประจำ (มาบ่อย, สั่งเมนูคุ้นเคย)
• ลูกค้าใหม่ (อยากลองของใหม่)
• ลูกค้าผ่านทาง (มาแค่ครั้งเดียว)
• ลูกค้ากลุ่ม (มาเป็นครอบครัว/เพื่อน)

วิธีดึงดูดและรักษาลูกค้า:
• สร้างความประทับใจครั้งแรก
• มีโปรสำหรับลูกค้าประจำ
• บริการที่อบอุ่นและเป็นมิตร
• คุณภาพอาหารที่สม่ำเสมอ

อยากรู้เรื่องลูกค้าเฉพาะด้านไหนเพิ่มเติมครับ?`,
        suggestions: ['วิธีรักษาลูกค้าประจำ', 'หาลูกค้าใหม่', 'เพิ่มความพึงพอใจ']
      };

    default:
      return {
        content: `ขอบคุณสำหรับคำถามครับ!

ผมอเล็กซ์ ที่ปรึกษาธุรกิจร้านอาหารที่พร้อมช่วยคุณในทุกเรื่องครับ ไม่ว่าจะเป็น:

บริการหลักของผม:
• การวิเคราะห์ข้อมูลธุรกิจอย่างละเอียด
• วางแผนกลยุทธ์การตลาด
• หาทางเพิ่มรายได้และลดต้นทุน
• ศึกษาคู่แข่งและหาจุดเด่น
• เข้าใจและดูแลลูกค้าให้ดีขึ้น

คุณอยากให้ผมช่วยเรื่องไหนเป็นพิเศษครับ? บอกมาได้เลย ผมพร้อมให้คำแนะนำที่เป็นประโยชน์ครับ!`,
        suggestions: ['วิเคราะห์ธุรกิจ', 'แนะนำกลยุทธ์', 'หาจุดแข็งร้าน']
      };
  }
}

// Natural English responses with personality
function generateEnglishResponse(message, intent) {
  switch (intent) {
    case 'greeting':
      return {
        content: `Hi there! I'm Alex, and I'm absolutely delighted to meet you!

I'm a restaurant business consultant with over 15 years of experience in the food industry. I know firsthand how challenging and rewarding this business can be, and I'm here to help you succeed!

Here's how I can help you:
• Deep revenue and sales analysis
• Effective marketing strategies that actually work
• Competitive analysis and market insights
• Better understanding of customer behavior
• Problem-solving and profit optimization

What's on your mind today? I'm here to help with whatever challenges you're facing!`,
        suggestions: ['Analyze my revenue', 'Get marketing advice', 'Study competitors']
      };

    case 'sales_analysis':
      return {
        content: `Fantastic question! Revenue and sales analysis is absolutely crucial for success.

From helping hundreds of restaurants, I've learned that good revenue analysis needs to look at multiple dimensions:

Key Revenue Metrics:
• Daily/weekly/monthly revenue trends
• Average Order Value (AOV)
• Customer count per day
• Best-selling menu items
• Peak vs. slow periods

Boosting Sales Strategies:
• Menu optimization and pricing
• Strategic promotions and timing
• Service quality improvements
• Smart social media marketing
• Customer loyalty programs

Would you like me to dive deeper into any specific aspect of your restaurant's revenue? I'm excited to help you grow!`,
        suggestions: ['Monthly revenue trends', 'Analyze best sellers', 'Suggest promotions']
      };

    case 'customer_analysis':
      return {
        content: `Excellent! Understanding your customers is the key to restaurant success.

From my experience working with restaurants, I've seen how different customer segments behave:

Main Customer Types:
• Regular customers (frequent visits, familiar orders)
• New customers (curious about trying new things)
• Walk-ins (one-time visitors)
• Group diners (families, friends, celebrations)

Customer Retention & Attraction:
• Create amazing first impressions
• Reward loyal customers with special offers
• Provide warm, friendly service
• Maintain consistent food quality
• Build community connections

What specific aspect of customer behavior would you like to explore? I'm here to help you build stronger relationships!`,
        suggestions: ['Retain regular customers', 'Attract new diners', 'Improve satisfaction']
      };

    default:
      return {
        content: `Thanks for reaching out!

I'm Alex, your friendly restaurant business consultant, and I'm here to help with whatever you need! Whether it's:

My core services:
• Detailed business data analysis
• Strategic marketing planning
• Revenue optimization and cost reduction
• Competitive analysis and positioning
• Customer experience enhancement

What would you like to focus on today? I'm excited to provide insights that will help your restaurant thrive! Just let me know what's most important to you right now.`,
        suggestions: ['Business analysis', 'Strategy advice', 'Find strengths']
      };
  }
}

// Worker fetch event handler
export default {
  async fetch(request, env, ctx) {
    try {
      // Create a mock Express request/response
      const url = new URL(request.url);
      
      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*', // Allow all origins for now
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Credentials': 'true',
          },
        });
      }

      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'bitebase-cloudflare-backend',
          version: '2.0.0',
          environment: env.NODE_ENV || 'production',
          services: {
            api: true,
            database: !!env.DATABASE_URL,
            redis: !!env.REDIS_URL,
            ai: !!env.BEDROCK_API_KEY,
            mapbox: !!env.MAPBOX_API_KEY,
          }
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // AI status endpoint
      if (url.pathname === '/ai') {
        return new Response(JSON.stringify({
          status: env.BEDROCK_API_KEY ? 'operational' : 'unavailable',
          version: '2.0.0',
          timestamp: new Date().toISOString(),
          features: ['conversational_analytics', 'predictive_insights', 'competitive_intelligence'],
          models: env.BEDROCK_API_KEY ? {
            chat: env.BEDROCK_CHAT_MODEL,
            reasoning: env.BEDROCK_REASONING_MODEL,
            fast: env.BEDROCK_FAST_MODEL,
            gateway_url: env.BEDROCK_API_BASE_URL
          } : null,
          fallback_available: true
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Admin authentication endpoint
      if (url.pathname === '/auth/admin' && request.method === 'POST') {
        try {
          const body = await request.json();
          const { email, password } = body;

          if (email === 'admin@bitebase.app' && password === 'Libralytics1234!*') {
            return new Response(JSON.stringify({
              success: true,
              message: 'Admin authentication successful',
              data: {
                user: {
                  id: 'admin',
                  email: 'admin@bitebase.app',
                  firstName: 'Admin',
                  lastName: 'User',
                  role: 'admin',
                  isAdmin: true
                },
                token: 'admin-token-' + Date.now()
              },
              timestamp: new Date().toISOString(),
              status: 200
            }), {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': env.CORS_ORIGIN || 'https://beta.bitebase.app',
              },
            });
          } else {
            return new Response(JSON.stringify({
              success: false,
              message: 'Invalid admin credentials',
              timestamp: new Date().toISOString(),
              status: 401
            }), {
              status: 401,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': env.CORS_ORIGIN || 'https://beta.bitebase.app',
              },
            });
          }
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Invalid request body',
            timestamp: new Date().toISOString(),
            status: 400
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': env.CORS_ORIGIN || 'https://beta.bitebase.app',
            },
          });
        }
      }

      // AI chat endpoint with human-like responses
      if (url.pathname === '/ai/chat' && request.method === 'POST') {
        try {
          const body = await request.json();
          const { message, conversation_id } = body;

          if (!message) {
            return new Response(JSON.stringify({
              success: false,
              message: 'Message is required',
              timestamp: new Date().toISOString(),
              status: 400
            }), {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': env.CORS_ORIGIN || 'https://beta.bitebase.app',
              },
            });
          }

          // Detect language and intent
          const language = detectLanguage(message);
          const intent = determineIntent(message);

          // Generate natural, human-like response
          const response = generateHumanLikeResponse(message, language, intent);

          const aiResponse = {
            success: true,
            message: 'AI response generated successfully',
            data: {
              response: response.content,
              intent: intent,
              language: language,
              suggestions: response.suggestions,
              model: 'alex-ai-consultant',
              data_source: 'bitebase-ai',
              conversation_id: conversation_id || crypto.randomUUID()
            },
            timestamp: new Date().toISOString(),
            status: 200
          };

          return new Response(JSON.stringify(aiResponse), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': env.CORS_ORIGIN || 'https://beta.bitebase.app',
            },
          });

        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Failed to process AI request',
            error: error.message,
            timestamp: new Date().toISOString(),
            status: 500
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': env.CORS_ORIGIN || 'https://beta.bitebase.app',
            },
          });
        }
      }

      // Admin metrics endpoint
      if (url.pathname === '/api/admin/metrics' && request.method === 'GET') {
        return new Response(JSON.stringify({
          users: {
            total: 1247,
            active: 892,
            newThisMonth: 89,
            churnRate: 0.045
          },
          revenue: {
            mrr: 24500,
            arr: 294000,
            growth: 0.125
          },
          system: {
            status: 'healthy',
            uptime: 0.996,
            responseTime: 145,
            errorRate: 0.002
          },
          subscriptions: {
            starter: 45,
            professional: 28,
            enterprise: 12
          }
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Restaurant search endpoint
      if (url.pathname === '/restaurants/search' && request.method === 'POST') {
        try {
          const body = await request.json();
          const { latitude, longitude, location, radius = 5, limit = 20 } = body;
          
          // Support both formats: direct lat/lng or location object
          const lat = latitude || location?.latitude;
          const lng = longitude || location?.longitude;
          
          if (!lat || !lng) {
            return new Response(JSON.stringify({
              success: false,
              message: 'Location coordinates are required (latitude and longitude)',
              timestamp: new Date().toISOString(),
              status: 400
            }), {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            });
          }

          // Query database for restaurants
          const query = `
            SELECT id, name, latitude, longitude, cuisine_types, price_range, rating, 
                   description, business_hours, created_at, updated_at
            FROM restaurants 
            WHERE is_active = 1
            ORDER BY 
              (latitude - ?) * (latitude - ?) + (longitude - ?) * (longitude - ?)
            LIMIT ?
          `;

          const { results } = await env.DB.prepare(query)
            .bind(lat, lat, lng, lng, limit)
            .all();

          // Calculate distances and format results
          const restaurants = results.map(restaurant => {
            const distance_km = calculateDistance(
              lat, lng, 
              restaurant.latitude, restaurant.longitude
            );

            return {
              id: restaurant.id,
              name: restaurant.name,
              cuisine_types: JSON.parse(restaurant.cuisine_types || '[]'),
              price_range: restaurant.price_range,
              rating: restaurant.rating,
              location: { 
                latitude: restaurant.latitude, 
                longitude: restaurant.longitude 
              },
              distance_km: Math.round(distance_km * 100) / 100,
              description: restaurant.description,
              business_hours: JSON.parse(restaurant.business_hours || '{}'),
              created_at: restaurant.created_at,
              updated_at: restaurant.updated_at
            };
          }).filter(restaurant => restaurant.distance_km <= radius);

          return new Response(JSON.stringify({
            success: true,
            data: {
              restaurants,
              search_params: { latitude, longitude, radius, limit },
              total_found: restaurants.length,
              generated_at: new Date().toISOString()
            },
            timestamp: new Date().toISOString(),
            status: 200
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        } catch (error) {
          console.error('Restaurant search error:', error);
          return new Response(JSON.stringify({
            success: false,
            message: 'Error searching restaurants: ' + error.message,
            timestamp: new Date().toISOString(),
            status: 500
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      // Restaurant featured endpoint
      if (url.pathname === '/restaurants/featured' && request.method === 'GET') {
        try {
          // Get top-rated restaurants from database
          const query = `
            SELECT id, name, latitude, longitude, cuisine_types, price_range, rating, 
                   description, business_hours, created_at, updated_at
            FROM restaurants 
            WHERE is_active = 1 AND rating >= 4.5
            ORDER BY rating DESC, total_reviews DESC
            LIMIT 10
          `;

          const { results } = await env.DB.prepare(query).all();

          const featuredRestaurants = results.map(restaurant => ({
            id: restaurant.id,
            name: restaurant.name,
            cuisine_types: JSON.parse(restaurant.cuisine_types || '[]'),
            price_range: restaurant.price_range,
            rating: restaurant.rating,
            location: { 
              latitude: restaurant.latitude, 
              longitude: restaurant.longitude 
            },
            description: restaurant.description,
            business_hours: JSON.parse(restaurant.business_hours || '{}'),
            featured_reason: restaurant.rating >= 4.8 ? 'Exceptional Rating' : 'Highly Rated',
            created_at: restaurant.created_at,
            updated_at: restaurant.updated_at
          }));

          return new Response(JSON.stringify({
            success: true,
            data: featuredRestaurants,
            timestamp: new Date().toISOString(),
            status: 200
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        } catch (error) {
          console.error('Featured restaurants error:', error);
          return new Response(JSON.stringify({
            success: false,
            message: 'Error fetching featured restaurants: ' + error.message,
            timestamp: new Date().toISOString(),
            status: 500
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      // Database initialization endpoint
      if (url.pathname === '/admin/init-db' && request.method === 'POST') {
        try {
          // Create restaurants table
          await env.DB.prepare(`CREATE TABLE IF NOT EXISTS restaurants (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            latitude REAL,
            longitude REAL,
            cuisine_types TEXT,
            price_range INTEGER CHECK (price_range BETWEEN 1 AND 4),
            rating REAL CHECK (rating >= 0 AND rating <= 5),
            total_reviews INTEGER DEFAULT 0,
            phone TEXT,
            email TEXT,
            website TEXT,
            description TEXT,
            business_hours TEXT,
            amenities TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            is_active INTEGER DEFAULT 1
          )`).run();

          // Insert sample restaurants
          await env.DB.prepare(`INSERT OR REPLACE INTO restaurants (id, name, latitude, longitude, cuisine_types, price_range, rating, description, business_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
            'rest_demo_001', 'Gaggan Progressive Indian', 13.7300, 100.5400, '["Indian", "Progressive", "Fine Dining"]', 4, 4.8, 'World-renowned progressive Indian cuisine restaurant in Bangkok', '{"monday": "18:00-23:00", "tuesday": "18:00-23:00", "wednesday": "18:00-23:00", "thursday": "18:00-23:00", "friday": "18:00-23:00", "saturday": "18:00-23:00", "sunday": "closed"}'
          ).run();

          await env.DB.prepare(`INSERT OR REPLACE INTO restaurants (id, name, latitude, longitude, cuisine_types, price_range, rating, description, business_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
            'rest_demo_002', 'Jay Fai', 13.7600, 100.5100, '["Thai", "Street Food"]', 2, 4.7, 'Michelin-starred street food stall famous for crab omelets', '{"monday": "14:00-19:00", "tuesday": "14:00-19:00", "wednesday": "closed", "thursday": "14:00-19:00", "friday": "14:00-19:00", "saturday": "14:00-19:00", "sunday": "14:00-19:00"}'
          ).run();

          await env.DB.prepare(`INSERT OR REPLACE INTO restaurants (id, name, latitude, longitude, cuisine_types, price_range, rating, description, business_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
            'rest_demo_003', 'Thip Samai Pad Thai', 13.7563, 100.5018, '["Thai", "Street Food", "Noodles"]', 1, 4.4, 'Famous for the best Pad Thai in Bangkok since 1966', '{"monday": "17:00-02:00", "tuesday": "17:00-02:00", "wednesday": "17:00-02:00", "thursday": "17:00-02:00", "friday": "17:00-02:00", "saturday": "17:00-02:00", "sunday": "17:00-02:00"}'
          ).run();

          return new Response(JSON.stringify({
            success: true,
            message: 'Database initialized successfully with sample restaurants',
            data: {
              restaurants_created: 3,
              sample_restaurants: [
                'Gaggan Progressive Indian',
                'Jay Fai', 
                'Thip Samai Pad Thai'
              ]
            },
            timestamp: new Date().toISOString(),
            status: 200
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });

        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Database initialization failed: ' + error.message,
            timestamp: new Date().toISOString(),
            status: 500
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      // Default response for other endpoints
      return new Response(JSON.stringify({
        message: 'BiteBase AI-Powered Backend',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        available_endpoints: [
          '/health',
          '/ai',
          '/ai/chat (Natural AI Assistant)',
          '/auth/admin',
          '/api/admin/metrics',
          '/restaurants/search (GET/POST)',
          '/restaurants/search/realtime',
          '/restaurants/featured',
          '/restaurants/{id}',
          '/api/restaurants',
          '/api/restaurants/{id}/analytics',
          '/foursquare/search',
          '/user/location/update'
        ]
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': env.CORS_ORIGIN || 'https://beta.bitebase.app',
        },
      });

    } catch (error) {
      console.error('Worker error:', error);
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message,
        timestamp: new Date().toISOString(),
        status: 500
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': env.CORS_ORIGIN || 'https://beta.bitebase.app',
        },
      });
    }
  },
};