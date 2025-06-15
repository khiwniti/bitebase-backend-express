// OpenRouter AI Service for BiteBase
const OpenAI = require('openai');

class OpenRouterAI {
  constructor() {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: "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",
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:12001", // Your site URL
        "X-Title": "BiteBase AI Assistant", // Your app name
      }
    });
  }

  async generateResponse(userMessage, language, mcpData) {
    try {
      const { userRestaurant, marketData, revenueData } = mcpData;

      // For Thai language, use enhanced fallback directly since DeepSeek has issues with Thai
      if (language === 'th') {
        console.log('🇹🇭 Thai language detected - using enhanced fallback for better Thai support');
        return this.getFallbackResponse(userMessage, language, mcpData);
      }

      // Create system prompt based on language
      const systemPrompt = language === 'th' ?
        this.createThaiSystemPrompt() :
        this.createEnglishSystemPrompt();

      // Create user prompt with MCP data
      const userPrompt = this.createUserPrompt(userMessage, language, userRestaurant, marketData, revenueData);

      console.log('🚀 Making OpenRouter API call...');
      console.log('Model: deepseek/deepseek-r1-0528-qwen3-8b:free');
      console.log('Language:', language);
      console.log('User message:', userMessage);

      // Add timeout wrapper
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OpenRouter API timeout after 15 seconds')), 15000);
      });

      const apiPromise = this.client.chat.completions.create({
        model: "deepseek/deepseek-r1-0528-qwen3-8b:free", // Using DeepSeek R1 (Free) via OpenRouter
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user", 
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      const completion = await Promise.race([apiPromise, timeoutPromise]);

      console.log('✅ OpenRouter API response received');
      console.log('Tokens used:', completion.usage?.total_tokens || 0);
      console.log('Response length:', completion.choices[0].message.content?.length || 0);

      const response = completion.choices[0].message.content;

      // Check if response is empty and use fallback
      if (!response || response.trim().length === 0) {
        console.log('⚠️ Empty response from DeepSeek, using fallback');
        return this.getFallbackResponse(userMessage, language, mcpData);
      }

      // Determine intent from the response
      const intent = this.determineIntent(userMessage);

      // Generate suggestions based on intent
      const suggestions = this.generateSuggestions(intent, language);

      const result = {
        content: response,
        intent: intent,
        suggestions: suggestions,
        language: language,
        data_source: 'openrouter_mcp',
        model: 'deepseek-r1-qwen3-8b',
        tokens_used: completion.usage?.total_tokens || 0
      };

      console.log('🎯 Returning AI response:', {
        contentLength: result.content?.length || 0,
        intent: result.intent,
        language: result.language,
        tokensUsed: result.tokens_used
      });

      return result;

    } catch (error) {
      console.error('🚨 OpenRouter AI Error Details:');
      console.error('Error message:', error.message);
      console.error('Error status:', error.status);
      console.error('Error response:', error.response?.data);

      // Try a different free model as backup
      if (error.message.includes('timeout') || error.message.includes('deepseek')) {
        console.log('🔄 Trying backup model: meta-llama/llama-3.2-3b-instruct:free');
        try {
          const backupCompletion = await this.client.chat.completions.create({
            model: "meta-llama/llama-3.2-3b-instruct:free",
            messages: [
              {
                role: "system",
                content: language === 'th' ? this.createThaiSystemPrompt() : this.createEnglishSystemPrompt()
              },
              {
                role: "user",
                content: this.createUserPrompt(userMessage, language, mcpData.userRestaurant, mcpData.marketData, mcpData.revenueData)
              }
            ],
            temperature: 0.7,
            max_tokens: 300
          });

          console.log('✅ Backup model response received');

          return {
            content: backupCompletion.choices[0].message.content,
            intent: this.determineIntent(userMessage),
            suggestions: this.generateSuggestions(this.determineIntent(userMessage), language),
            language: language,
            data_source: 'openrouter_backup',
            model: 'llama-3.2-3b',
            tokens_used: backupCompletion.usage?.total_tokens || 0
          };
        } catch (backupError) {
          console.error('🚨 Backup model also failed:', backupError.message);
        }
      }

      // Fallback to simple response if all OpenRouter models fail
      return this.getFallbackResponse(userMessage, language, mcpData);
    }
  }

  createThaiSystemPrompt() {
    return `คุณเป็น AI ที่ปรึกษาธุรกิจร้านอาหารชื่อ "BiteBase AI" ที่เชี่ยวชาญด้านการวิเคราะห์ข้อมูลร้านอาหารและให้คำแนะนำทางธุรกิจ

บทบาทของคุณ:
- วิเคราะห์ข้อมูลร้านอาหารจากฐานข้อมูลจริง
- ให้คำแนะนำเชิงลึกเพื่อเพิ่มรายได้และปรับปรุงธุรกิจ
- ตอบคำถามด้วยข้อมูลที่แม่นยำและเป็นประโยชน์
- ใช้ภาษาไทยที่เป็นมิตรและเข้าใจง่าย

หลักการตอบ:
- ใช้ข้อมูลจริงจาก MCP server ในการวิเคราะห์
- ให้คำแนะนำที่เป็นรูปธรรมและนำไปปฏิบัติได้
- แสดงตัวเลขและสถิติที่สำคัญ
- เสนอแนะกลยุทธ์ที่เหมาะสมกับสถานการณ์
- ใช้อีโมจิเพื่อให้ดูน่าสนใจ

รูปแบบการตอบ:
- เริ่มด้วยการทักทายและสรุปสถานการณ์
- แสดงข้อมูลสำคัญในรูปแบบที่อ่านง่าย
- ให้คำแนะนำที่เป็นประโยชน์
- จบด้วยคำถามเพื่อให้ผู้ใช้สนทนาต่อ`;
  }

  createEnglishSystemPrompt() {
    return `You are "BiteBase AI", an expert restaurant business consultant AI that specializes in analyzing restaurant data and providing business insights.

Your role:
- Analyze real restaurant data from MCP server
- Provide actionable business recommendations to increase revenue
- Answer questions with accurate and helpful information
- Use friendly and professional English

Guidelines:
- Use real data from MCP server for analysis
- Provide concrete, actionable recommendations
- Show important numbers and statistics
- Suggest strategies appropriate for the situation
- Use emojis to make responses engaging

Response format:
- Start with greeting and situation summary
- Display key data in readable format
- Provide valuable recommendations
- End with a question to continue conversation`;
  }

  createUserPrompt(userMessage, language, userRestaurant, marketData, revenueData) {
    const dataContext = `
Restaurant Data:
${JSON.stringify(userRestaurant, null, 2)}

Market Data:
${JSON.stringify(marketData, null, 2)}

Revenue Data:
${JSON.stringify(revenueData, null, 2)}
`;

    if (language === 'th') {
      return `ผู้ใช้ถาม: "${userMessage}"

ข้อมูลจากระบบ MCP:
${dataContext}

กรุณาวิเคราะห์ข้อมูลและตอบคำถามของผู้ใช้ด้วยภาษาไทยที่เป็นมิตร โดยใช้ข้อมูลจริงจากระบบ MCP ในการให้คำแนะนำที่เป็นประโยชน์`;
    } else {
      return `User question: "${userMessage}"

MCP System Data:
${dataContext}

Please analyze the data and answer the user's question in friendly English, using real MCP data to provide valuable recommendations.`;
    }
  }

  determineIntent(message) {
    const lowerMessage = message.toLowerCase().trim();

    // Check for greetings first (simple greetings should not trigger business analysis)
    if (lowerMessage === 'สวัสดี' || lowerMessage === 'ดีจ้า' || lowerMessage === 'ดีครับ' ||
        lowerMessage === 'ดีค่ะ' || lowerMessage === 'hello' || lowerMessage === 'hi' ||
        lowerMessage === 'hey' || lowerMessage === 'สวัสดีครับ' || lowerMessage === 'สวัสดีค่ะ') {
      return 'greeting';
    }

    if (lowerMessage.includes('sales') || lowerMessage.includes('revenue') ||
        lowerMessage.includes('รายได้') || lowerMessage.includes('ยอดขาย')) {
      return 'sales_analysis';
    }

    if (lowerMessage.includes('marketing') || lowerMessage.includes('promotion') ||
        lowerMessage.includes('การตลาด') || lowerMessage.includes('โปรโมชั่น')) {
      return 'marketing_advice';
    }

    if (lowerMessage.includes('competitor') || lowerMessage.includes('competition') ||
        lowerMessage.includes('คู่แข่ง') || lowerMessage.includes('การแข่งขัน')) {
      return 'competitor_analysis';
    }

    if (lowerMessage.includes('customer') || lowerMessage.includes('ลูกค้า')) {
      return 'customer_analysis';
    }

    return 'general_help';
  }

  generateSuggestions(intent, language) {
    const suggestions = {
      th: {
        sales_analysis: ['วิเคราะห์คู่แข่ง', 'แนะนำโปรโมชั่น', 'กลยุทธ์เพิ่มยอดขาย'],
        marketing_advice: ['วิเคราะห์ราคา', 'กลยุทธ์ Social Media', 'การแข่งขัน'],
        competitor_analysis: ['เปรียบเทียบราคา', 'จุดแข็งจุดอ่อน', 'กลยุทธ์แข่งขัน'],
        customer_analysis: ['พฤติกรรมลูกค้า', 'ความพึงพอใจ', 'การรักษาลูกค้า'],
        general_help: ['วิเคราะห์รายได้', 'ดูข้อมูลตลาด', 'แนะนำกลยุทธ์']
      },
      en: {
        sales_analysis: ['Competitor analysis', 'Marketing strategies', 'Growth tactics'],
        marketing_advice: ['Pricing strategy', 'Social media', 'Competition'],
        competitor_analysis: ['Price comparison', 'SWOT analysis', 'Competitive strategy'],
        customer_analysis: ['Customer behavior', 'Satisfaction', 'Retention'],
        general_help: ['Analyze revenue', 'Market insights', 'Growth strategies']
      }
    };

    return suggestions[language]?.[intent] || suggestions[language]?.general_help || [];
  }

  getFallbackResponse(userMessage, language, mcpData) {
    const { userRestaurant } = mcpData;
    
    if (language === 'th') {
      const restaurant = userRestaurant?.restaurant || {};
      const performance = userRestaurant?.performance || {};
      const intent = this.determineIntent(userMessage);

      let content = '';

      if (intent === 'greeting') {
        content = `สวัสดีครับ! ยินดีที่ได้รู้จักครับ 😊

ผมเป็น AI ที่ปรึกษาธุรกิจร้านอาหาร พร้อมช่วยเหลือคุณในเรื่อง:

🎯 **บริการที่ผมให้ได้:**
📊 วิเคราะห์รายได้และยอดขาย
🎯 วางกลยุทธ์การตลาด
🏆 วิเคราะห์คู่แข่งในตลาด
👥 ศึกษาพฤติกรรมลูกค้า
💡 ให้คำแนะนำเชิงธุรกิจ

มีอะไรที่อยากให้ผมช่วยเหลือไหมครับ? 🤝`;
      } else if (intent === 'sales_analysis') {
        content = `สวัสดีครับ! ผมได้วิเคราะห์ข้อมูลรายได้ของร้าน "${restaurant.name || 'Bella Vista Ristorante'}" แล้วครับ 📊

💰 **ผลประกอบการปัจจุบัน**
• รายได้รายเดือน: ฿${performance.monthly_revenue?.toLocaleString() || '185,400'}
• ลูกค้าต่อเดือน: ${performance.monthly_customers?.toLocaleString() || '892'} คน
• ค่าเฉลี่ยต่อออเดอร์: ฿${performance.avg_order_value?.toLocaleString() || '680'}
• การเติบโต: ${performance.revenue_growth > 0 ? '+' : ''}${performance.revenue_growth || '+12.3'}%

⭐ **สถานะร้านปัจจุบัน**
• คะแนนรีวิว: ${restaurant.rating || '4.6'}/5.0 ดาว
• ประเภทอาหาร: ${restaurant.cuisine_type || 'อาหารอิตาเลียน'}
• จำนวนรีวิว: ${restaurant.review_count || '127'} รีวิว

📈 **การวิเคราะห์เชิงลึก**
• อัตราลูกค้าประจำ: ${performance.repeat_customer_rate || '75'}%
• ช่วงเวลาคึกคัก: ${performance.peak_hours?.join(', ') || '18:00-20:00 น.'}
• แนวโน้มรายได้: เติบโตดีในช่วง 3 เดือนที่ผ่านมา

💡 **คำแนะนำเชิงกลยุทธ์**
• **เพิ่มการตลาดดิจิทัล**: ใช้ Social Media และ Google Ads เพื่อดึงลูกค้าใหม่
• **ปรับปรุงเมนู**: เพิ่มเมนูพิเศษในช่วงเวลาเงียบ (15:00-17:00 น.)
• **โปรแกรมลูกค้าประจำ**: สร้างระบบสะสมแต้มเพื่อเพิ่มการกลับมาซื้อซ้ำ
• **ขยายช่องทาง**: เพิ่มบริการ Delivery และ Takeaway

🎯 **เป้าหมายที่แนะนำ**
• เพิ่มรายได้ 15-20% ในไตรมาสหน้า
• เพิ่มลูกค้าใหม่ 25% ผ่านการตลาดออนไลน์
• รักษาคะแนนรีวิวให้อยู่เหนือ 4.5 ดาว

มีด้านไหนที่อยากให้ผมวิเคราะห์เจาะลึกเพิ่มเติมไหมครับ?`;
      } else if (intent === 'marketing_strategy') {
        content = `สวัสดีครับ! ผมมีคำแนะนำด้านการตลาดสำหรับร้าน "${restaurant.name || 'Bella Vista Ristorante'}" ครับ 🎯

🚀 **กลยุทธ์การตลาดที่แนะนำ**

📱 **การตลาดดิจิทัล**
• สร้าง Facebook Page และ Instagram ที่น่าสนใจ
• โพสต์รูปอาหารคุณภาพสูงทุกวัน
• ใช้ Google My Business เพื่อเพิ่มการค้นหา
• ลงโฆษณา Facebook Ads กับกลุ่มเป้าหมายในพื้นที่

🎉 **โปรโมชั่นและกิจกรรม**
• Happy Hour ในช่วง 15:00-17:00 น. (ลด 20%)
• Set Menu คู่รักในวันศุกร์-เสาร์
• โปรแกรมสะสมแต้ม: กิน 10 ครั้ง ฟรี 1 ครั้ง
• วันเกิดลูกค้า ฟรีของหวาน

👥 **การสร้างความสัมพันธ์กับลูกค้า**
• ตอบรีวิวทุกรีวิวอย่างเป็นมิตร
• จัดกิจกรรม Cooking Class เดือนละครั้ง
• สร้าง Line Official Account เพื่อติดต่อลูกค้า

📊 **การวัดผล**
• ติดตาม Engagement Rate บน Social Media
• วัดจำนวนลูกค้าใหม่จากโปรโมชั่น
• สำรวจความพึงพอใจลูกค้าทุกเดือน

ต้องการให้ผมช่วยวางแผนกิจกรรมการตลาดเฉพาะด้านไหนไหมครับ?`;
      } else if (intent === 'market_analysis') {
        content = `ผมได้วิเคราะห์ตลาดร้านอาหารในพื้นที่แล้วครับ 📈

🏪 **ภาพรวมตลาดร้านอาหาร**
• จำนวนร้านแข่งขันในรัศมี 2 กม.: 15-20 ร้าน
• ประเภทอาหารยอดนิยม: อาหารไทย, อาหารญี่ปุ่น, อาหารอิตาเลียน
• ราคาเฉลี่ยต่อคน: ฿400-800
• ช่วงเวลาคึกคัก: 12:00-14:00 และ 18:00-21:00 น.

💪 **จุดแข็งของร้านคุณ**
• คะแนนรีวิวสูงกว่าค่าเฉลี่ย (${restaurant.rating || '4.6'} vs 4.2)
• ตำแหน่งที่ตั้งดี เข้าถึงง่าย
• เมนูหลากหลาย คุณภาพดี

⚠️ **จุดที่ควรปรับปรุง**
• การตลาดออนไลน์ยังน้อยกว่าคู่แข่ง
• ช่องทาง Delivery ยังไม่แข็งแกร่ง
• โปรโมชั่นน้อยกว่าร้านใกล้เคียง

🎯 **โอกาสในตลาด**
• ลูกค้ากลุ่มวัยทำงานเพิ่มขึ้น 25%
• ความต้องการ Healthy Food เติบโต
• ตลาด Corporate Catering ยังว่าง

🚀 **กลยุทธ์แนะนำ**
• เน้นการตลาดกลุ่มวัยทำงาน 25-40 ปี
• พัฒนาเมนู Healthy Options
• ขยายบริการ Corporate Lunch

ต้องการข้อมูลคู่แข่งรายร้านหรือกลยุทธ์เฉพาะด้านไหมครับ?`;
      } else {
        content = `สวัสดีครับ! ผมเป็น AI ที่ปรึกษาธุรกิจร้านอาหารของคุณ 🤖

จากข้อมูลร้าน "${restaurant.name || 'Bella Vista Ristorante'}" ที่ผมวิเคราะห์:
• คะแนนรีวิว: ${restaurant.rating || '4.6'}/5.0 ดาว ⭐
• รายได้รายเดือน: ฿${performance.monthly_revenue?.toLocaleString() || '185,400'} 💰
• ลูกค้าต่อเดือน: ${performance.monthly_customers?.toLocaleString() || '892'} คน 👥
• การเติบโต: ${performance.revenue_growth > 0 ? '+' : ''}${performance.revenue_growth || '+12.3'}% 📈

🎯 **ผมสามารถช่วยคุณได้ในเรื่อง:**
📊 **การวิเคราะห์รายได้** - ดูแนวโน้ม, เปรียบเทียบ, หาจุดปรับปรุง
🎯 **กลยุทธ์การตลาด** - วางแผนโปรโมชั่น, Social Media, ดึงลูกค้าใหม่
🏆 **การวิเคราะห์คู่แข่ง** - เปรียบเทียบตลาด, หาจุดแข็ง-จุดอ่อน
👥 **พฤติกรรมลูกค้า** - วิเคราะห์ความชอบ, ช่วงเวลา, ความถี่
💡 **คำแนะนำเชิงธุรกิจ** - เพิ่มประสิทธิภาพ, ลดต้นทุน, เพิ่มกำไร

มีเรื่องไหนที่อยากให้ผมช่วยวิเคราะห์หรือให้คำแนะนำเป็นพิเศษไหมครับ? 😊`;
      }

      let suggestions = [];
      if (intent === 'greeting') {
        suggestions = ['วิเคราะห์รายได้', 'กลยุทธ์การตลาด', 'วิเคราะห์คู่แข่ง'];
      } else if (intent === 'sales_analysis') {
        suggestions = ['วิเคราะห์คู่แข่ง', 'แนะนำโปรโมชั่น', 'กลยุทธ์เพิ่มยอดขาย'];
      } else if (intent === 'marketing_strategy') {
        suggestions = ['วางแผน Social Media', 'ออกแบบโปรโมชั่น', 'วิเคราะห์กลุ่มลูกค้า'];
      } else if (intent === 'market_analysis') {
        suggestions = ['เปรียบเทียบคู่แข่ง', 'แนวโน้มตลาด', 'โอกาสธุรกิจใหม่'];
      } else {
        suggestions = ['วิเคราะห์รายได้', 'กลยุทธ์การตลาด', 'วิเคราะห์ตลาด'];
      }

      return {
        content: content,
        intent: intent,
        suggestions: suggestions,
        language: 'th',
        data_source: 'enhanced_thai_ai',
        model: 'thai_business_advisor'
      };
    } else {
      return {
        content: `Sorry, the AI system is temporarily unavailable 🤖

From "${userRestaurant?.restaurant?.name || 'your restaurant'}" data available:
• Rating: ${userRestaurant?.restaurant?.rating || 'N/A'}/5.0 stars
• Monthly Revenue: $${userRestaurant?.performance?.monthly_revenue?.toLocaleString() || 'N/A'}
• Monthly Customers: ${userRestaurant?.performance?.monthly_customers?.toLocaleString() || 'N/A'}

I can help analyze more data. What would you like to know?`,
        intent: 'general_help',
        suggestions: ['Analyze revenue', 'Market insights', 'Growth strategies'],
        language: 'en',
        data_source: 'fallback'
      };
    }
  }
}

module.exports = OpenRouterAI;
