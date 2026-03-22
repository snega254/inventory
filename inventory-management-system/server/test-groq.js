import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function test() {
  console.log('🔍 Testing Groq API...');
  console.log('API Key:', process.env.GROQ_API_KEY?.substring(0, 10) + '...');
  
  // Current working models (as of March 2026)
  const models = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768'
  ];
  
  for (const model of models) {
    try {
      console.log(`\n🔄 Trying model: ${model}`);
      const completion = await groq.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: 'Say "Hello, I am working!"' }],
        temperature: 0.7,
        max_tokens: 50
      });
      
      console.log(`✅ SUCCESS with ${model}!`);
      console.log('Response:', completion.choices[0].message.content);
      console.log(`\n🎉 Use model: ${model} in your code`);
      return;
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
  
  console.log('\n❌ All models failed.');
}

test();