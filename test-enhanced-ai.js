/**
 * Test script for enhanced AI conversation features
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:12001';

// Test cases for natural conversation
const testCases = [
  // Thai language tests
  {
    message: 'สวัสดีครับ',
    language: 'th',
    expectedIntent: 'greeting',
    description: 'Thai greeting test'
  },
  {
    message: 'วิเคราะห์รายได้ของร้านผมหน่อยครับ',
    language: 'th',
    expectedIntent: 'sales_analysis',
    description: 'Thai revenue analysis request'
  },
  {
    message: 'ลูกค้าของร้านเป็นอย่างไรบ้างครับ',
    language: 'th',
    expectedIntent: 'customer_analysis',
    description: 'Thai customer analysis request'
  },
  
  // English language tests
  {
    message: 'Hello!',
    language: 'en',
    expectedIntent: 'greeting',
    description: 'English greeting test'
  },
  {
    message: 'Can you analyze my restaurant revenue?',
    language: 'en',
    expectedIntent: 'sales_analysis',
    description: 'English revenue analysis request'
  },
  {
    message: 'What about my competitors?',
    language: 'en',
    expectedIntent: 'competitor_analysis',
    description: 'English competitor analysis request'
  },

  // Mixed and edge cases
  {
    message: 'Hi ครับ',
    language: 'th',
    expectedIntent: 'greeting',
    description: 'Mixed language greeting (should detect Thai)'
  },
  {
    message: 'revenue วิเคราะห์',
    language: 'th',
    expectedIntent: 'sales_analysis',
    description: 'Mixed language analysis request'
  }
];

async function testAIConversation(testCase) {
  console.log(`\n🧪 Testing: ${testCase.description}`);
  console.log(`📝 Message: "${testCase.message}"`);
  console.log(`🌐 Expected Language: ${testCase.language}`);
  console.log(`🎯 Expected Intent: ${testCase.expectedIntent}`);
  
  try {
    const response = await axios.post(`${BASE_URL}/api/ai/chat`, {
      message: testCase.message,
      user_id: 'test_user_123'
    });

    if (response.data.success) {
      const aiResponse = response.data.data;
      
      console.log(`✅ Response received:`);
      console.log(`   🌐 Detected Language: ${aiResponse.language}`);
      console.log(`   🎯 Detected Intent: ${aiResponse.intent}`);
      console.log(`   🤖 Model: ${aiResponse.model || 'N/A'}`);
      console.log(`   📊 Data Source: ${aiResponse.data_source}`);
      console.log(`   💬 Response Length: ${aiResponse.response?.length || 0} characters`);

      // Show first 200 characters of response
      if (aiResponse.response) {
        const preview = aiResponse.response.substring(0, 200);
        console.log(`   📄 Response Preview: "${preview}${aiResponse.response.length > 200 ? '...' : ''}"`);
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
        validationResults.push('✅ Intent detection correct');
      } else {
        validationResults.push(`❌ Intent detection wrong (got ${aiResponse.intent}, expected ${testCase.expectedIntent})`);
      }
      
      // Check for Alex persona indicators
      const content = aiResponse.response?.toLowerCase() || '';
      const hasPersonality = content.includes('alex') ||
                           content.includes('อเล็กซ์') ||
                           content.includes('😊') ||
                           content.includes('💪') ||
                           content.includes('🎯');

      if (hasPersonality) {
        validationResults.push('✅ Alex persona detected');
      } else {
        validationResults.push('⚠️ Alex persona not clearly evident');
      }

      // Check for natural conversation elements
      const isNatural = content.includes('!') ||
                       content.includes('?') ||
                       content.includes('ครับ') ||
                       content.includes('นะ') ||
                       (testCase.language === 'en' && (content.includes('great') || content.includes('fantastic')));

      if (isNatural) {
        validationResults.push('✅ Natural conversation tone detected');
      } else {
        validationResults.push('⚠️ Conversation could be more natural');
      }
      
      console.log(`   🔍 Validation Results:`);
      validationResults.forEach(result => console.log(`      ${result}`));
      
      return {
        success: true,
        languageCorrect: aiResponse.language === testCase.language,
        intentCorrect: aiResponse.intent === testCase.expectedIntent,
        hasPersonality: hasPersonality,
        isNatural: isNatural,
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

async function testLanguageDetection() {
  console.log('\n🧪 Testing Language Detection...');
  
  const languageTests = [
    { text: 'สวัสดีครับ', expected: 'th' },
    { text: 'Hello there!', expected: 'en' },
    { text: 'วิเคราะห์รายได้', expected: 'th' },
    { text: 'revenue analysis', expected: 'en' },
    { text: 'Hi ครับ', expected: 'th' },
    { text: 'restaurant ร้านอาหาร', expected: 'th' }
  ];
  
  for (const test of languageTests) {
    try {
      const response = await axios.post(`${BASE_URL}/api/ai/chat`, {
        message: test.text,
        user_id: 'test_user_lang'
      });
      
      if (response.data.success) {
        const detected = response.data.data.language;
        const correct = detected === test.expected;
        console.log(`   "${test.text}" -> ${detected} ${correct ? '✅' : '❌'} (expected ${test.expected})`);
      }
    } catch (error) {
      console.log(`   "${test.text}" -> Error: ${error.message}`);
    }
  }
}

async function runAllTests() {
  console.log('🚀 Starting Enhanced AI Conversation Test Suite');
  console.log('=' .repeat(70));
  
  let totalTests = 0;
  let passedTests = 0;
  let languageCorrect = 0;
  let intentCorrect = 0;
  let personalityDetected = 0;
  let naturalConversation = 0;
  
  // Test language detection first
  await testLanguageDetection();
  
  // Test conversation cases
  for (const testCase of testCases) {
    const result = await testAIConversation(testCase);
    totalTests++;
    
    if (result.success) {
      passedTests++;
      if (result.languageCorrect) languageCorrect++;
      if (result.intentCorrect) intentCorrect++;
      if (result.hasPersonality) personalityDetected++;
      if (result.isNatural) naturalConversation++;
    }
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('📊 Enhanced AI Test Results Summary:');
  console.log(`✅ Tests Passed: ${passedTests}/${totalTests} (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log(`🌐 Language Detection: ${languageCorrect}/${totalTests} (${Math.round((languageCorrect/totalTests)*100)}%)`);
  console.log(`🎯 Intent Detection: ${intentCorrect}/${totalTests} (${Math.round((intentCorrect/totalTests)*100)}%)`);
  console.log(`👤 Alex Persona: ${personalityDetected}/${totalTests} (${Math.round((personalityDetected/totalTests)*100)}%)`);
  console.log(`💬 Natural Conversation: ${naturalConversation}/${totalTests} (${Math.round((naturalConversation/totalTests)*100)}%)`);
  
  if (passedTests === totalTests && languageCorrect >= totalTests * 0.8 && personalityDetected >= totalTests * 0.7) {
    console.log('\n🎉 Enhanced AI system is working excellently!');
    console.log('✨ Natural conversation features are active');
    console.log('🤖 Alex persona is functioning properly');
    console.log('🌏 Bilingual support is operational');
  } else if (passedTests >= totalTests * 0.7) {
    console.log('\n✅ Enhanced AI system is working well with minor improvements needed');
  } else {
    console.log('\n⚠️ Enhanced AI system needs attention - some features may not be working properly');
  }
}

// Run the tests
runAllTests().catch(console.error);
