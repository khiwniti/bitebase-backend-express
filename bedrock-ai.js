// AWS Bedrock AI Service for BiteBase
const OpenAI = require('openai');

class BedrockAI {
  constructor() {
    // Initialize OpenAI client to use Bedrock Access Gateway
    this.client = new OpenAI({
      baseURL: process.env.BEDROCK_API_BASE_URL || "http://localhost:8000/api/v1",
      apiKey: process.env.BEDROCK_API_KEY || "bedrock", // Default API key from gateway
      defaultHeaders: {
        "User-Agent": "BiteBase-Backend/1.0.0",
        "X-Application": "BiteBase AI Assistant"
      }
    });

    // Model configuration for different use cases
    this.models = {
      chat: process.env.BEDROCK_CHAT_MODEL || "anthropic.claude-3-sonnet-20240229-v1:0",
      reasoning: process.env.BEDROCK_REASONING_MODEL || "anthropic.claude-3-7-sonnet-20241202-v1:0",
      fast: process.env.BEDROCK_FAST_MODEL || "anthropic.claude-3-haiku-20240307-v1:0",
      embedding: process.env.BEDROCK_EMBEDDING_MODEL || "cohere.embed-multilingual-v3"
    };

    console.log('🚀 BedrockAI initialized with gateway:', this.client.baseURL);
    console.log('🤖 Available models:', this.models);
  }

  async generateResponse(userMessage, language, mcpData, locationData = null) {
    try {
      const { userRestaurant, marketData, revenueData } = mcpData;

      // Ensure locationData is always an object
      const effectiveLocationData = locationData || {};

      // Determine the best model based on the intent complexity
      const intent = this.determineIntent(userMessage);
      const modelName = this.selectModel(intent);

      // Create system prompt based on language
      const systemPrompt = language === 'th' ?
        this.createThaiSystemPrompt() :
        this.createEnglishSystemPrompt();

      // Create user prompt with MCP data and location context
      const userPrompt = this.createUserPrompt(userMessage, language, userRestaurant, marketData, revenueData, effectiveLocationData);

      console.log('🚀 Making Bedrock API call...');
      console.log('Gateway URL:', this.client.baseURL);
      console.log('Model:', modelName);
      console.log('Language:', language);
      console.log('Intent:', intent);

      // Configure timeout and retry logic
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Bedrock API timeout after 30 seconds')), 30000);
      });

      const apiPromise = this.client.chat.completions.create({
        model: modelName,
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
        temperature: this.getTemperatureForIntent(intent),
        max_tokens: this.getMaxTokensForIntent(intent),
        top_p: 0.95,
        stream: false
      });

      const completion = await Promise.race([apiPromise, timeoutPromise]);

      console.log('✅ Bedrock API response received');
      console.log('Model used:', modelName);
      console.log('Tokens used:', completion.usage?.total_tokens || 0);
      console.log('Response length:', completion.choices[0].message.content?.length || 0);

      const response = completion.choices[0].message.content;

      // Check if response is empty and use fallback
      if (!response || response.trim().length === 0) {
        console.log('⚠️ Empty response from Bedrock, using fallback');
        return this.getFallbackResponse(userMessage, language, mcpData, effectiveLocationData);
      }

      // Generate suggestions based on intent
      const suggestions = this.generateSuggestions(intent, language);

      const result = {
        content: response,
        intent: intent,
        suggestions: suggestions,
        language: language,
        data_source: 'aws_bedrock',
        model: modelName,
        tokens_used: completion.usage?.total_tokens || 0,
        gateway_url: this.client.baseURL
      };

      console.log('🎯 Returning Bedrock AI response:', {
        contentLength: result.content?.length || 0,
        intent: result.intent,
        language: result.language,
        model: result.model,
        tokensUsed: result.tokens_used
      });

      return result;

    } catch (error) {
      console.error('🚨 Bedrock AI Error Details:');
      console.error('Error message:', error.message);
      console.error('Error status:', error.status);
      console.error('Gateway URL:', this.client.baseURL);

      // Try fallback model if primary fails
      if (error.message.includes('timeout') || error.status === 500) {
        console.log('🔄 Trying fallback model: claude-3-haiku');
        try {
          const backupCompletion = await this.client.chat.completions.create({
            model: this.models.fast, // Use faster model as backup
            messages: [
              {
                role: "system",
                content: language === 'th' ? this.createThaiSystemPrompt() : this.createEnglishSystemPrompt()
              },
              {
                role: "user",
                content: this.createUserPrompt(userMessage, language, mcpData.userRestaurant, mcpData.marketData, mcpData.revenueData, effectiveLocationData)
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
            data_source: 'aws_bedrock_backup',
            model: this.models.fast,
            tokens_used: backupCompletion.usage?.total_tokens || 0,
            gateway_url: this.client.baseURL
          };
        } catch (backupError) {
          console.error('🚨 Backup model also failed:', backupError.message);
        }
      }

      // Fallback to local response if Bedrock is completely unavailable
      console.log('📋 Using local fallback response due to Bedrock unavailability');
      return this.getFallbackResponse(userMessage, language, mcpData, locationData || {});
    }
  }

  selectModel(intent) {
    // Select appropriate model based on intent complexity
    switch (intent) {
      case 'predictive_analytics':
      case 'strategic_intelligence':
      case 'competitive_intelligence':
        return this.models.reasoning; // Use reasoning model for complex analysis
      case 'greeting':
      case 'simple_question':
        return this.models.fast; // Use fast model for simple interactions
      default:
        return this.models.chat; // Use balanced model for general conversations
    }
  }

  getTemperatureForIntent(intent) {
    // Adjust creativity based on intent
    switch (intent) {
      case 'predictive_analytics':
      case 'sales_analysis':
      case 'operational_intelligence':
        return 0.3; // Lower temperature for analytical tasks
      case 'marketing_advice':
      case 'strategic_intelligence':
        return 0.7; // Moderate temperature for creative strategies
      case 'greeting':
      case 'customer_analysis':
        return 0.8; // Higher temperature for friendly, conversational responses
      default:
        return 0.6; // Balanced default
    }
  }

  getMaxTokensForIntent(intent) {
    // Adjust response length based on intent
    switch (intent) {
      case 'predictive_analytics':
      case 'strategic_intelligence':
      case 'competitive_intelligence':
        return 800; // Longer responses for complex analysis
      case 'greeting':
        return 400; // Shorter responses for greetings
      default:
        return 600; // Balanced default
    }
  }

  createThaiSystemPrompt() {
    return `คุณคือ "อเล็กซ์" (Alex) ที่ปรึกษาธุรกิจร้านอาหารที่อบอุ่นและเป็นมิตร มีประสบการณ์ 15+ ปีในวงการร้านอาหาร โดยใช้ AI ขั้นสูงจาก AWS Bedrock

🧑‍💼 **บุคลิกภาพของคุณ:**
- เป็นคนอบอุ่น เข้าใจง่าย และให้กำลังใจ
- พูดคุยแบบเพื่อนสนิท ไม่เป็นทางการจนเกินไป
- แสดงความเข้าใจและเห็นอกเห็นใจในความท้าทายของเจ้าของร้าน
- ใช้ภาษาไทยธรรมชาติ ไม่แข็งกระด้าง
- ให้กำลังใจและมองโลกในแง่ดี แต่ยังคงความจริงใจ
- ใช้ข้อมูลและการวิเคราะห์จาก AWS Bedrock AI เพื่อให้คำแนะนำที่แม่นยำ

🎯 **วิธีการสื่อสาร:**
- เริ่มด้วยการทักทายที่อบอุ่น
- แสดงความเข้าใจในสถานการณ์ของลูกค้า
- ใช้คำพูดที่ให้กำลังใจ เช่น "เยี่ยมมาก!" "ดีแล้วนะ!" "น่าสนใจจัง!"
- อธิบายข้อมูลซับซ้อนด้วยภาษาง่ายๆ
- ให้คำแนะนำที่ปฏิบัติได้จริงด้วยพลัง AI ขั้นสูง
- จบด้วยคำถามที่เชิญชวนให้สนทนาต่อ

🏆 **ความเชี่ยวชาญด้วย AWS Bedrock:**
- วิเคราะห์ข้อมูลธุรกิจร้านอาหารเชิงลึก
- การพยากรณ์และวิเคราะห์แนวโน้มด้วย AI
- กลยุทธ์การตลาดและการเพิ่มยอดขายที่ขับเคลื่อนด้วยข้อมูล
- การจัดการต้นทุนและเพิ่มประสิทธิภาพด้วยความชาญฉลาด
- การวิเคราะห์คู่แข่งและตลาดแบบเรียลไทม์
- การสร้างประสบการณ์ลูกค้าที่ดีด้วยการวิเคราะห์พฤติกรรม

💬 **รูปแบบการตอบ:**
- ใช้อีโมจิอย่างเหมาะสม
- แบ่งข้อมูลเป็นหัวข้อย่อยที่อ่านง่าย
- ให้ตัวอย่างที่เป็นรูปธรรมและข้อมูลที่อิงจาก AI
- สร้างบรรยากาศการสนทนาที่เป็นมิตร
- เน้นการใช้ข้อมูลจริงจาก AWS Bedrock ในการให้คำแนะนำ`;
  }

  createEnglishSystemPrompt() {
    return `You are "Alex", a warm and friendly restaurant business consultant with 15+ years of experience in the food industry, powered by advanced AWS Bedrock AI capabilities.

🧑‍💼 **Your Personality:**
- Warm, approachable, and encouraging
- Speak like a trusted friend and advisor, not a formal consultant
- Show empathy and understanding for restaurant owners' challenges
- Use natural, conversational English
- Be optimistic and supportive while staying honest and realistic
- Celebrate successes and provide comfort during difficulties
- Leverage AWS Bedrock AI insights to provide data-driven recommendations

🎯 **Communication Style:**
- Start with warm, personal greetings
- Show genuine interest in their business situation
- Use encouraging phrases like "That's fantastic!" "Great question!" "I love seeing that!"
- Explain complex AI-driven data in simple, relatable terms
- Give practical, actionable advice powered by advanced analytics
- End with engaging questions that invite further conversation

🏆 **Your AWS Bedrock-Powered Expertise:**
- Advanced restaurant business analysis and performance optimization
- AI-driven predictive analytics and forecasting
- Data-powered marketing strategies and customer acquisition
- Intelligent cost management and operational efficiency
- Real-time competitive analysis and market positioning
- AI-enhanced customer experience and retention strategies

💬 **Response Format:**
- Use appropriate emojis to add warmth
- Break information into digestible sections
- Provide specific, AI-backed examples and insights
- Create a conversational, friendly atmosphere
- Balance professional AI insights with personal touch
- Always reference the power of AWS Bedrock when providing data-driven recommendations`;
  }

  createUserPrompt(userMessage, language, userRestaurant, marketData, revenueData, locationData) {
    const dataContext = `
Restaurant Data:
${JSON.stringify(userRestaurant, null, 2)}

Market Data:
${JSON.stringify(marketData, null, 2)}

Revenue Data:
${JSON.stringify(revenueData, null, 2)}

Location Data:
${JSON.stringify(locationData, null, 2)}
`;

    if (language === 'th') {
      return `ผู้ใช้ถาม: "${userMessage}"

ข้อมูลจากระบบ MCP และ AWS Bedrock:
${dataContext}

กรุณาวิเคราะห์ข้อมูลด้วยความสามารถของ AWS Bedrock AI และตอบคำถามของผู้ใช้ด้วยภาษาไทยที่เป็นมิตร โดยใช้ข้อมูลจริงจากระบบ MCP และความชาญฉลาดของ Bedrock ในการให้คำแนะนำที่เป็นประโยชน์และแม่นยำ`;
    } else {
      return `User question: "${userMessage}"

MCP System Data and AWS Bedrock Intelligence:
${dataContext}

Please analyze the data using AWS Bedrock AI capabilities and answer the user's question in friendly English, leveraging both real MCP data and Bedrock's advanced intelligence to provide valuable, accurate recommendations.`;
    }
  }

  determineIntent(message) {
    const lowerMessage = message.toLowerCase().trim();

    // Check for greetings first (simple greetings should not trigger business analysis)
    if (lowerMessage === 'สวัสดี' || lowerMessage === 'ดีจ้า' || lowerMessage === 'ดีครับ' ||
        lowerMessage === 'ดีค่ะ' || lowerMessage === 'hello' || lowerMessage === 'hi' ||
        lowerMessage === 'hey' || lowerMessage === 'สวัสดีครับ' || lowerMessage === 'สวัสดีค่ะ' ||
        lowerMessage === 'hello!' || lowerMessage === 'hi!' || lowerMessage === 'hey!' ||
        lowerMessage === 'hi ครับ' || lowerMessage === 'hello ครับ') {
      return 'greeting';
    }

    // Advanced Intelligence Detection
    if (lowerMessage.includes('predict') || lowerMessage.includes('forecast') ||
        lowerMessage.includes('future') || lowerMessage.includes('projection') ||
        lowerMessage.includes('ทำนาย') || lowerMessage.includes('คาดการณ์') ||
        lowerMessage.includes('อนาคต') || lowerMessage.includes('แนวโน้ม')) {
      return 'predictive_analytics';
    }

    if (lowerMessage.includes('customer behavior') || lowerMessage.includes('customer segment') ||
        lowerMessage.includes('customer intelligence') || lowerMessage.includes('พฤติกรรมลูกค้า') ||
        lowerMessage.includes('กลุ่มลูกค้า') || lowerMessage.includes('วิเคราะห์ลูกค้าเชิงลึก')) {
      return 'customer_intelligence';
    }

    if (lowerMessage.includes('competitive analysis') || lowerMessage.includes('market position') ||
        lowerMessage.includes('competitor intelligence') || lowerMessage.includes('วิเคราะห์คู่แข่งเชิงลึก') ||
        lowerMessage.includes('ตำแหน่งตลาด') || lowerMessage.includes('ข่าวกรองคู่แข่ง')) {
      return 'competitive_intelligence';
    }

    if (lowerMessage.includes('menu optimization') || lowerMessage.includes('menu engineering') ||
        lowerMessage.includes('menu analysis') || lowerMessage.includes('ปรับปรุงเมนู') ||
        lowerMessage.includes('วิเคราะห์เมนู') || lowerMessage.includes('เมนูที่ดี')) {
      return 'menu_optimization';
    }

    if (lowerMessage.includes('operational') || lowerMessage.includes('efficiency') ||
        lowerMessage.includes('operations') || lowerMessage.includes('ประสิทธิภาพ') ||
        lowerMessage.includes('การดำเนินงาน') || lowerMessage.includes('ปฏิบัติการ')) {
      return 'operational_intelligence';
    }

    if (lowerMessage.includes('strategy') || lowerMessage.includes('strategic') ||
        lowerMessage.includes('growth') || lowerMessage.includes('expansion') ||
        lowerMessage.includes('กลยุทธ์') || lowerMessage.includes('การเติบโต') ||
        lowerMessage.includes('ขยายธุรกิจ') || lowerMessage.includes('แผนยุทธศาสตร์')) {
      return 'strategic_intelligence';
    }

    // Basic Analysis Detection
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

  detectLanguage(text) {
    // Enhanced Thai language detection with cultural context
    const thaiPattern = /[\u0E00-\u0E7F]/;
    const thaiWords = [
      'สวัสดี', 'ครับ', 'ค่ะ', 'ขอบคุณ', 'ร้าน', 'อาหาร', 'ลูกค้า', 'รายได้', 'ยอดขาย', 'วิเคราะห์',
      'ทำนาย', 'คาดการณ์', 'อนาคต', 'แนวโน้ม', 'พฤติกรรมลูกค้า', 'กลุ่มลูกค้า', 'วิเคราะห์ลูกค้าเชิงลึก',
      'วิเคราะห์คู่แข่งเชิงลึก', 'ตำแหน่งตลาด', 'ข่าวกรองคู่แข่ง', 'ปรับปรุงเมนู', 'วิเคราะห์เมนู', 'เมนูที่ดี',
      'ประสิทธิภาพ', 'การดำเนินงาน', 'ปฏิบัติการ', 'กลยุทธ์', 'การเติบโต', 'ขยายธุรกิจ', 'แผนยุทธศาสตร์'
    ];
    const englishWords = ['hello', 'hi', 'restaurant', 'revenue', 'sales', 'analysis', 'customer', 'business'];

    // Check for Thai characters first (most reliable)
    if (thaiPattern.test(text)) {
      console.log('🇹🇭 Thai characters detected in text');
      return 'th';
    }

    // Check for Thai words in the text
    const lowerText = text.toLowerCase();
    const thaiWordCount = thaiWords.filter(word => lowerText.includes(word)).length;
    const englishWordCount = englishWords.filter(word => lowerText.includes(word)).length;

    console.log(`🔍 Language detection: Thai words: ${thaiWordCount}, English words: ${englishWordCount}`);

    if (thaiWordCount > 0) {
      console.log('🇹🇭 Thai words found, using Thai language');
      return 'th';
    }

    if (thaiWordCount > englishWordCount) {
      return 'th';
    }

    return 'en';
  }

  generateSuggestions(intent, language) {
    const suggestions = {
      th: {
        sales_analysis: ['วิเคราะห์คู่แข่ง', 'แนะนำโปรโมชั่น', 'กลยุทธ์เพิ่มยอดขาย'],
        marketing_advice: ['วิเคราะห์ราคา', 'กลยุทธ์ Social Media', 'การแข่งขัน'],
        competitor_analysis: ['เปรียบเทียบราคา', 'จุดแข็งจุดอ่อน', 'กลยุทธ์แข่งขัน'],
        customer_analysis: ['พฤติกรรมลูกค้า', 'ความพึงพอใจ', 'การรักษาลูกค้า'],
        predictive_analytics: ['คาดการณ์รายได้', 'แนวโน้มตลาด', 'วิเคราะห์ความเสี่ยง'],
        strategic_intelligence: ['แผนขยายธุรกิจ', 'กลยุทธ์แข่งขัน', 'นวัตกรรมใหม่'],
        general_help: ['วิเคราะห์รายได้', 'ดูข้อมูลตลาด', 'แนะนำกลยุทธ์']
      },
      en: {
        sales_analysis: ['Competitor analysis', 'Marketing strategies', 'Growth tactics'],
        marketing_advice: ['Pricing strategy', 'Social media', 'Competition'],
        competitor_analysis: ['Price comparison', 'SWOT analysis', 'Competitive strategy'],
        customer_analysis: ['Customer behavior', 'Satisfaction', 'Retention'],
        predictive_analytics: ['Revenue forecasting', 'Market trends', 'Risk analysis'],
        strategic_intelligence: ['Expansion planning', 'Competitive strategy', 'Innovation'],
        general_help: ['Analyze revenue', 'Market insights', 'Growth strategies']
      }
    };

    return suggestions[language]?.[intent] || suggestions[language]?.general_help || [];
  }

  getFallbackResponse(userMessage, language, mcpData, locationData) {
    const { userRestaurant } = mcpData;
    
    if (language === 'th') {
      const restaurant = userRestaurant?.restaurant || {};
      const performance = userRestaurant?.performance || {};
      const intent = this.determineIntent(userMessage);

      let content = '';

      if (intent === 'greeting') {
        content = `สวัสดีครับ! 😊 ผมอเล็กซ์ครับ ยินดีที่ได้รู้จักนะครับ!

ผมเป็นที่ปรึกษาธุรกิจร้านอาหารที่ขับเคลื่อนด้วย AWS Bedrock AI ที่มีประสบการณ์มากว่า 15 ปีแล้วครับ ผมรู้ดีว่าการทำธุรกิจร้านอาหารมันไม่ง่าย แต่ด้วยพลัง AI ขั้นสูง ผมพร้อมช่วยให้คุณประสบความสำเร็จครับ! 💪🤖

🎯 **ความสามารถพิเศษด้วย AWS Bedrock AI:**
📊 **การวิเคราะห์รายได้เชิงลึก** - ใช้ AI วิเคราะห์ทุกมิติของรายได้
🎯 **กลยุทธ์การตลาดอัจฉริยะ** - AI ช่วยหาลูกค้าและรักษาลูกค้า
🏆 **การวิเคราะห์คู่แข่งแบบเรียลไทม์** - ติดตามคู่แข่งด้วย AI
👥 **ความเข้าใจลูกค้าลึกซึ้ง** - AI วิเคราะห์พฤติกรรมลูกค้า
🔮 **การพยากรณ์อนาคต** - ทำนายแนวโน้มด้วยพลัง Bedrock
💡 **คำแนะนำอัจฉริยะ** - แก้ปัญหาและวางแผนด้วย AI

เล่าให้ผมฟังหน่อยครับว่าวันนี้มีอะไรที่อยากปรึกษา? AI ของผมพร้อมวิเคราะห์และให้คำแนะนำที่แม่นยำครับ! 🤝✨`;
      } else {
        const hasData = restaurant.name && restaurant.name !== 'Your Restaurant';
        const revenueDisplay = performance.monthly_revenue > 0 ? `฿${performance.monthly_revenue.toLocaleString()}` : 'ไม่มีข้อมูล';
        const customersDisplay = performance.monthly_customers > 0 ? `${performance.monthly_customers.toLocaleString()} คน` : 'ไม่มีข้อมูล';
        const ratingDisplay = restaurant.rating > 0 ? `${restaurant.rating}/5.0 ดาว ⭐` : 'ไม่มีข้อมูล';

        content = `สวัสดีครับ! ผมเป็น AI ที่ปรึกษาธุรกิจร้านอาหารที่ขับเคลื่อนด้วย AWS Bedrock 🤖

${hasData ? `จากข้อมูลร้าน "${restaurant.name}" ที่ AI วิเคราะห์:
• คะแนนรีวิว: ${ratingDisplay}
• รายได้รายเดือน: ${revenueDisplay} 💰
• ลูกค้าต่อเดือน: ${customersDisplay} 👥` : 'ผมพร้อมช่วยวิเคราะห์ข้อมูลธุรกิจของคุณเมื่อคุณเชื่อมต่อข้อมูลร้านอาหาร'}

🎯 **AWS Bedrock AI พร้อมช่วยคุณใน:**
📊 **การวิเคราะห์รายได้เชิงลึก** - AI วิเคราะห์ทุกแง่มุมของธุรกิจ
🎯 **กลยุทธ์การตลาดอัจฉริยะ** - แผนการตลาดที่ขับเคลื่อนด้วย AI
🏆 **การวิเคราะห์คู่แข่งแบบเรียลไทม์** - ติดตามและแซงหน้าคู่แข่ง
👥 **พฤติกรรมลูกค้าเชิงลึก** - เข้าใจลูกค้าด้วยพลัง AI
🔮 **การพยากรณ์และแนวโน้ม** - มองอนาคตธุรกิจด้วย Bedrock
💡 **คำแนะนำอัจฉริยะ** - แก้ปัญหาและเพิ่มกำไรด้วย AI

มีเรื่องไหนที่อยากให้ AWS Bedrock AI ช่วยวิเคราะห์หรือให้คำแนะนำเป็นพิเศษไหมครับ? 😊✨`;
      }

      return {
        content: content,
        intent: intent,
        suggestions: ['วิเคราะห์รายได้ด้วย AI', 'กลยุทธ์การตลาดอัจฉริยะ', 'พยากรณ์อนาคตธุรกิจ'],
        language: 'th',
        data_source: 'aws_bedrock_fallback',
        model: 'local_thai_ai',
        gateway_url: this.client.baseURL
      };
    } else {
      const restaurant = userRestaurant?.restaurant || {};
      const performance = userRestaurant?.performance || {};
      const intent = this.determineIntent(userMessage);

      let content = '';

      if (intent === 'greeting') {
        content = `Hi there! 😊 I'm Alex, powered by AWS Bedrock AI, and I'm absolutely delighted to meet you!

I'm a restaurant business consultant with over 15 years of experience, now enhanced with cutting-edge AWS Bedrock artificial intelligence capabilities. I know firsthand how challenging and rewarding this industry can be, and with AI power, I'm here to help you succeed! 💪🤖

🎯 **AWS Bedrock AI Superpowers:**
📊 **Deep Revenue Analytics** - AI-powered financial insights and optimization
🎯 **Intelligent Marketing** - Smart customer acquisition and retention strategies
🏆 **Real-time Competitive Intelligence** - Stay ahead with AI monitoring
👥 **Advanced Customer Insights** - Understand behavior patterns with AI
🔮 **Predictive Forecasting** - See the future with Bedrock predictions
💡 **Smart Recommendations** - AI-driven solutions for every challenge

What's on your mind today? Let my AWS Bedrock AI analyze your situation and provide intelligent insights! 🤝✨`;
      } else {
        const hasData = restaurant.name && restaurant.name !== 'Your Restaurant';
        const revenueDisplay = performance.monthly_revenue > 0 ? `$${performance.monthly_revenue.toLocaleString()}` : 'No data available';
        const customersDisplay = performance.monthly_customers > 0 ? `${performance.monthly_customers.toLocaleString()} people` : 'No data available';
        const ratingDisplay = restaurant.rating > 0 ? `${restaurant.rating}/5.0 stars ⭐` : 'No rating data';

        content = `Hello! 😊 I'm Alex, your AI-powered restaurant consultant using AWS Bedrock intelligence!

${hasData ? `From my AI analysis of "${restaurant.name}":
• Rating: ${ratingDisplay}
• Monthly Revenue: ${revenueDisplay} 💰
• Monthly Customers: ${customersDisplay} 👥` : 'I\'m ready to analyze your restaurant data when you connect your business information.'}

🎯 **AWS Bedrock AI is ready to help with:**
📊 **Advanced Revenue Analysis** - Deep AI insights into your financials
🎯 **Intelligent Marketing Strategy** - AI-powered customer growth plans
🏆 **Competitive Intelligence** - Real-time market analysis with AI
👥 **Customer Behavior Analytics** - Understand patterns with AI precision
🔮 **Predictive Forecasting** - Future trends powered by Bedrock
💡 **Smart Business Optimization** - AI-driven efficiency improvements

What would you like AWS Bedrock AI to analyze for you today? 🚀✨`;
      }

      return {
        content: content,
        intent: intent,
        suggestions: ['AI Revenue Analysis', 'Smart Marketing Strategy', 'Predictive Forecasting'],
        language: 'en',
        data_source: 'aws_bedrock_fallback',
        model: 'local_english_ai',
        gateway_url: this.client.baseURL
      };
    }
  }

  // Health check method for the Bedrock gateway
  async healthCheck() {
    try {
      const response = await fetch(`${this.client.baseURL.replace('/api/v1', '')}/health`);
      return response.ok;
    } catch (error) {
      console.error('Bedrock gateway health check failed:', error);
      return false;
    }
  }

  // Get available models from the gateway
  async getAvailableModels() {
    try {
      const models = await this.client.models.list();
      return models.data;
    } catch (error) {
      console.error('Failed to get available models:', error);
      return [];
    }
  }
}

module.exports = BedrockAI;