/**
 * Test script for advanced AI intelligence features
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:12001';

// Test cases for advanced AI intelligence
const advancedTestCases = [
  // Predictive Analytics Tests
  {
    message: 'Can you predict my restaurant revenue for the next 3 months?',
    language: 'en',
    expectedIntent: 'predictive_analytics',
    description: 'English predictive analytics request'
  },
  {
    message: 'ทำนายรายได้ของร้านในอนาคต 3 เดือนข้างหน้าหน่อยครับ',
    language: 'th',
    expectedIntent: 'predictive_analytics',
    description: 'Thai predictive analytics request'
  },

  // Customer Intelligence Tests
  {
    message: 'Analyze my customer behavior and segments',
    language: 'en',
    expectedIntent: 'customer_intelligence',
    description: 'English customer intelligence request'
  },
  {
    message: 'วิเคราะห์พฤติกรรมลูกค้าและกลุ่มลูกค้าของร้านผมหน่อยครับ',
    language: 'th',
    expectedIntent: 'customer_intelligence',
    description: 'Thai customer intelligence request'
  },

  // Competitive Intelligence Tests
  {
    message: 'Give me competitive analysis and market positioning insights',
    language: 'en',
    expectedIntent: 'competitive_intelligence',
    description: 'English competitive intelligence request'
  },
  {
    message: 'วิเคราะห์คู่แข่งเชิงลึกและตำแหน่งตลาดของร้านผม',
    language: 'th',
    expectedIntent: 'competitive_intelligence',
    description: 'Thai competitive intelligence request'
  },

  // Menu Optimization Tests
  {
    message: 'Help me optimize my menu for better profitability',
    language: 'en',
    expectedIntent: 'menu_optimization',
    description: 'English menu optimization request'
  },
  {
    message: 'ช่วยปรับปรุงเมนูให้มีกำไรมากขึ้นหน่อยครับ',
    language: 'th',
    expectedIntent: 'menu_optimization',
    description: 'Thai menu optimization request'
  },

  // Operational Intelligence Tests
  {
    message: 'Analyze my operational efficiency and suggest improvements',
    language: 'en',
    expectedIntent: 'operational_intelligence',
    description: 'English operational intelligence request'
  },
  {
    message: 'วิเคราะห์ประสิทธิภาพการดำเนินงานและแนะนำการปรับปรุง',
    language: 'th',
    expectedIntent: 'operational_intelligence',
    description: 'Thai operational intelligence request'
  },

  // Strategic Intelligence Tests
  {
    message: 'What are my strategic growth opportunities and expansion plans?',
    language: 'en',
    expectedIntent: 'strategic_intelligence',
    description: 'English strategic intelligence request'
  },
  {
    message: 'มีโอกาสการเติบโตและแผนขยายธุรกิจอะไรบ้างครับ',
    language: 'th',
    expectedIntent: 'strategic_intelligence',
    description: 'Thai strategic intelligence request'
  }
];

async function testAdvancedAIIntelligence(testCase) {
  console.log(`\n🧠 Testing: ${testCase.description}`);
  console.log(`📝 Message: "${testCase.message}"`);
  console.log(`🌐 Expected Language: ${testCase.language}`);
  console.log(`🎯 Expected Intent: ${testCase.expectedIntent}`);
  
  try {
    const response = await axios.post(`${BASE_URL}/api/ai/chat`, {
      message: testCase.message,
      user_id: 'advanced_test_user',
      context: {
        language: testCase.language,
        userId: 'test_restaurant_123'
      }
    });

    if (response.data.success) {
      const aiResponse = response.data.data;
      
      console.log(`✅ Response received:`);
      console.log(`   🌐 Detected Language: ${aiResponse.language}`);
      console.log(`   🎯 Detected Intent: ${aiResponse.intent}`);
      console.log(`   🤖 Model: ${aiResponse.model || 'N/A'}`);
      console.log(`   📊 Data Source: ${aiResponse.data_source}`);
      console.log(`   💬 Response Length: ${aiResponse.response?.length || 0} characters`);
      
      // Show first 300 characters of response
      if (aiResponse.response) {
        const preview = aiResponse.response.substring(0, 300);
        console.log(`   📄 Response Preview: "${preview}${aiResponse.response.length > 300 ? '...' : ''}"`);
      }
      
      // Show suggestions
      if (aiResponse.suggestions && aiResponse.suggestions.length > 0) {
        console.log(`   💡 Suggestions: ${aiResponse.suggestions.join(', ')}`);
      }
      
      // Validate results
      let validationResults = [];
      
      if (aiResponse.language === testCase.language) {
        validationResults.push('✅ Language detection correct');
      } else {
        validationResults.push(`❌ Language detection wrong (got ${aiResponse.language}, expected ${testCase.language})`);
      }
      
      if (aiResponse.intent === testCase.expectedIntent) {
        validationResults.push('✅ Advanced intent detection correct');
      } else {
        validationResults.push(`❌ Intent detection wrong (got ${aiResponse.intent}, expected ${testCase.expectedIntent})`);
      }
      
      // Check for advanced intelligence indicators
      const content = aiResponse.response?.toLowerCase() || '';
      const hasAdvancedIntelligence = content.includes('predict') || 
                                    content.includes('forecast') ||
                                    content.includes('segment') ||
                                    content.includes('competitive') ||
                                    content.includes('optimization') ||
                                    content.includes('strategic') ||
                                    content.includes('ทำนาย') ||
                                    content.includes('คาดการณ์') ||
                                    content.includes('กลุ่ม') ||
                                    content.includes('กลยุทธ์');
      
      if (hasAdvancedIntelligence) {
        validationResults.push('✅ Advanced intelligence content detected');
      } else {
        validationResults.push('⚠️ Advanced intelligence content not clearly evident');
      }
      
      // Check for Alex persona
      const hasPersonality = content.includes('alex') || 
                           content.includes('อเล็กซ์') ||
                           content.includes('😊') ||
                           content.includes('💪') ||
                           content.includes('🎯');
      
      if (hasPersonality) {
        validationResults.push('✅ Alex persona maintained');
      } else {
        validationResults.push('⚠️ Alex persona not clearly evident');
      }
      
      console.log(`   🔍 Validation Results:`);
      validationResults.forEach(result => console.log(`      ${result}`));
      
      return {
        success: true,
        languageCorrect: aiResponse.language === testCase.language,
        intentCorrect: aiResponse.intent === testCase.expectedIntent,
        hasAdvancedIntelligence: hasAdvancedIntelligence,
        hasPersonality: hasPersonality,
        responseLength: aiResponse.response?.length || 0
      };
      
    } else {
      console.log(`❌ API Error: ${response.data.error}`);
      return { success: false, error: response.data.error };
    }
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.response?.data?.error || error.message}`);
    return { success: false, error: error.message };
  }
}

async function testMCPTools() {
  console.log('\n🔧 Testing MCP Advanced Intelligence Tools...');
  
  const tools = [
    'get_predictive_analytics',
    'get_customer_intelligence',
    'get_competitive_intelligence',
    'get_menu_optimization',
    'get_operational_intelligence',
    'get_strategic_intelligence'
  ];
  
  for (const tool of tools) {
    try {
      const response = await axios.post(`${BASE_URL}/api/mcp/execute`, {
        tool_name: tool,
        parameters: {
          restaurant_id: 'test_restaurant_123'
        }
      });
      
      if (response.data.success) {
        console.log(`   ✅ ${tool}: Working`);
        console.log(`      Data source: ${response.data.result.data_source || 'N/A'}`);
      } else {
        console.log(`   ❌ ${tool}: Failed - ${response.data.error}`);
      }
    } catch (error) {
      console.log(`   ❌ ${tool}: Error - ${error.message}`);
    }
  }
}

async function runAdvancedIntelligenceTests() {
  console.log('🧠 Starting Advanced AI Intelligence Test Suite');
  console.log('=' .repeat(80));
  
  let totalTests = 0;
  let passedTests = 0;
  let languageCorrect = 0;
  let intentCorrect = 0;
  let advancedIntelligenceDetected = 0;
  let personalityDetected = 0;
  
  // Test MCP tools first
  await testMCPTools();
  
  // Test advanced conversation cases
  for (const testCase of advancedTestCases) {
    const result = await testAdvancedAIIntelligence(testCase);
    totalTests++;
    
    if (result.success) {
      passedTests++;
      if (result.languageCorrect) languageCorrect++;
      if (result.intentCorrect) intentCorrect++;
      if (result.hasAdvancedIntelligence) advancedIntelligenceDetected++;
      if (result.hasPersonality) personalityDetected++;
    }
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('📊 Advanced AI Intelligence Test Results Summary:');
  console.log(`✅ Tests Passed: ${passedTests}/${totalTests} (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log(`🌐 Language Detection: ${languageCorrect}/${totalTests} (${Math.round((languageCorrect/totalTests)*100)}%)`);
  console.log(`🎯 Advanced Intent Detection: ${intentCorrect}/${totalTests} (${Math.round((intentCorrect/totalTests)*100)}%)`);
  console.log(`🧠 Advanced Intelligence: ${advancedIntelligenceDetected}/${totalTests} (${Math.round((advancedIntelligenceDetected/totalTests)*100)}%)`);
  console.log(`👤 Alex Persona: ${personalityDetected}/${totalTests} (${Math.round((personalityDetected/totalTests)*100)}%)`);
  
  if (passedTests === totalTests && intentCorrect >= totalTests * 0.8 && advancedIntelligenceDetected >= totalTests * 0.7) {
    console.log('\n🎉 Advanced AI Intelligence system is working excellently!');
    console.log('🧠 Predictive analytics, customer intelligence, and strategic insights are active');
    console.log('🤖 Alex persona is functioning with advanced capabilities');
    console.log('🌏 Bilingual advanced intelligence is operational');
  } else if (passedTests >= totalTests * 0.7) {
    console.log('\n✅ Advanced AI Intelligence system is working well with minor improvements needed');
  } else {
    console.log('\n⚠️ Advanced AI Intelligence system needs attention - some features may not be working properly');
  }
  
  console.log('\n🔮 Advanced Features Available:');
  console.log('   📈 Predictive Analytics - Revenue forecasting and trend analysis');
  console.log('   👥 Customer Intelligence - Behavioral analysis and segmentation');
  console.log('   🏆 Competitive Intelligence - Market positioning and competitor analysis');
  console.log('   🍽️ Menu Optimization - Profitability and engineering insights');
  console.log('   ⚙️ Operational Intelligence - Efficiency analysis and recommendations');
  console.log('   🎯 Strategic Intelligence - Growth opportunities and strategic planning');
}

// Run the tests
runAdvancedIntelligenceTests().catch(console.error);
