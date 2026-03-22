import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('='.repeat(50));
console.log('🔍 GEMINI CONNECTION TEST');
console.log('='.repeat(50));

const apiKey = process.env.GEMINI_API_KEY;
console.log('1. API Key present:', apiKey ? '✅ YES' : '❌ NO');

if (apiKey) {
  console.log('2. Key starts with:', apiKey.substring(0, 10) + '...');
  
  // Test connection
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    console.log('3. Testing connection...');
    const result = await model.generateContent('Say "OK" if you can hear me');
    const response = await result.response.text();
    
    console.log('4. ✅ SUCCESS! Gemini responded:', response);
    console.log('\n🎉 Your API key is working!');
    
  } catch (error) {
    console.log('3. ❌ Connection failed:', error.message);
    console.log('\n🔧 Possible issues:');
    console.log('   - Invalid API key');
    console.log('   - Wrong model name');
    console.log('   - Network issue');
  }
}

console.log('\n' + '='.repeat(50));