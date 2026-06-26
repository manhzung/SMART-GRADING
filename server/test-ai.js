/**
 * Gemini AI Service Test Script
 * Run: node test-ai.js
 */

const axios = require('axios');
const config = require('./src/config/config');

const GEMINI_API_KEY = config.ai?.geminiApiKey;
const GEMINI_MODEL = config.ai?.geminiModel || 'gemini-1.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function testGeminiAPI() {
  console.log('\n========================================');
  console.log('🔬 GEMINI AI SERVICE - FULL TEST');
  console.log('========================================\n');

  // Test 1: Configuration Check
  console.log('📋 Test 1: Configuration Check');
  console.log(`   Model: ${GEMINI_MODEL}`);
  console.log(`   API Key: ${GEMINI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  if (!GEMINI_API_KEY) {
    console.log('   ❌ FAIL: GEMINI_API_KEY not configured');
    return;
  }
  console.log('   ✅ PASS\n');

  // Test 2: Simple Chat
  console.log('📋 Test 2: Simple Chat');
  try {
    const response = await axios.post(`${API_URL}?key=${GEMINI_API_KEY}`, {
      contents: [{
        parts: [{ text: 'Xin chào! Bạn là ai?' }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 256,
      }
    });
    
    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      console.log('   ✅ PASS');
      console.log(`   Response: "${text.substring(0, 100)}..."\n`);
    } else {
      console.log('   ❌ FAIL: Empty response\n');
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.response?.data?.error?.message || error.message}\n`);
  }

  // Test 3: Vietnamese Math Problem
  console.log('📋 Test 3: Vietnamese Math Problem');
  try {
    const response = await axios.post(`${API_URL}?key=${GEMINI_API_KEY}`, {
      contents: [{
        parts: [{
          text: 'Giải bài toán: Một hình chữ nhật có chiều dài 15cm, chiều rộng 8cm. Tính chu vi và diện tích.'
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 512,
      }
    });
    
    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      console.log('   ✅ PASS');
      console.log(`   Response:\n${text}\n`);
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.response?.data?.error?.message || error.message}\n`);
  }

  // Test 4: JSON Structured Output
  console.log('📋 Test 4: JSON Structured Output');
  try {
    const response = await axios.post(`${API_URL}?key=${GEMINI_API_KEY}`, {
      contents: [{
        parts: [{
          text: 'Trả lời JSON: {"greeting": "lời chào", "question": "câu hỏi đã hỏi gì"}'
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 256,
      }
    });
    
    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      try {
        JSON.parse(text);
        console.log('   ✅ PASS - Valid JSON');
      } catch {
        console.log('   ⚠️ PARTIAL - Response received but not valid JSON');
      }
      console.log(`   Response: ${text.substring(0, 80)}...\n`);
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.response?.data?.error?.message || error.message}\n`);
  }

  // Test 5: Long Response (Question Generation)
  console.log('📋 Test 5: Question Generation');
  try {
    const response = await axios.post(`${API_URL}?key=${GEMINI_API_KEY}`, {
      contents: [{
        parts: [{
          text: `Tạo 3 câu hỏi trắc nghiệm về chủ đề "Phương trình bậc 2". 
Format JSON:
[
  {
    "question": "câu hỏi",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "A",
    "explanation": "giải thích"
  }
]`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    });
    
    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      console.log('   ✅ PASS');
      console.log(`   Generated Questions:\n${text.substring(0, 300)}...\n`);
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.response?.data?.error?.message || error.message}\n`);
  }

  // Test 6: Safety Settings
  console.log('📋 Test 6: Safety Settings');
  try {
    const response = await axios.post(`${API_URL}?key=${GEMINI_API_KEY}`, {
      contents: [{
        parts: [{ text: 'Hello, how are you?' }]
      }],
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ]
    });
    console.log('   ✅ PASS - Safety settings working\n');
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.response?.data?.error?.message || error.message}\n`);
  }

  // Test 7: Rate Limit Handling
  console.log('📋 Test 7: Multiple Rapid Requests (Rate Limit Test)');
  const promises = [];
  for (let i = 0; i < 3; i++) {
    promises.push(
      axios.post(`${API_URL}?key=${GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: `Request ${i + 1}` }] }],
        generationConfig: { maxOutputTokens: 50 }
      }).catch(err => ({ error: true, message: err.message }))
    );
  }
  
  const results = await Promise.all(promises);
  const successCount = results.filter(r => !r.error).length;
  console.log(`   Results: ${successCount}/3 successful`);
  console.log(successCount === 3 ? '   ✅ PASS\n' : '   ⚠️ Some rate limiting occurred\n');

  console.log('========================================');
  console.log('🏁 TEST COMPLETE');
  console.log('========================================\n');
}

testGeminiAPI().catch(console.error);
