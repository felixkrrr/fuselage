require('dotenv').config();
const { OpenAI } = require('openai');
const { Langfuse } = require('langfuse-node');

async function testOpenAI() {
  console.log('Testing OpenAI API...');
  console.log('API Key:', process.env.OPENAI_API_KEY ? 'Set (first 5 chars: ' + process.env.OPENAI_API_KEY.substring(0, 5) + '...)' : 'Not set');
  console.log('Model:', process.env.OPENAI_MODEL || 'Not set, using default');
  
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    console.log('Making API call to OpenAI...');
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is Langfuse?' }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });
    
    console.log('Response received:');
    console.log(completion.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('Error with OpenAI API:');
    console.error(error);
    return false;
  }
}

async function testLangfuse() {
  console.log('\nTesting Langfuse API...');
  console.log('Public Key:', process.env.LANGFUSE_PUBLIC_KEY ? 'Set (first 5 chars: ' + process.env.LANGFUSE_PUBLIC_KEY.substring(0, 5) + '...)' : 'Not set');
  console.log('Secret Key:', process.env.LANGFUSE_SECRET_KEY ? 'Set (first 5 chars: ' + process.env.LANGFUSE_SECRET_KEY.substring(0, 5) + '...)' : 'Not set');
  console.log('Host:', process.env.LANGFUSE_HOST || 'Not set, using default');
  
  try {
    const langfuse = new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'
    });
    
    const trace = langfuse.trace({
      name: 'test_trace',
      metadata: {
        test: true
      }
    });
    
    console.log('Created test trace with ID:', trace.id);
    
    const span = trace.span({
      name: 'test_span',
      input: { test: 'data' }
    });
    span.end();
    
    console.log('Added span to trace');
    
    trace.update({
      output: { result: 'success' }
    });
    
    console.log('Updated trace');
    return true;
  } catch (error) {
    console.error('Error with Langfuse API:');
    console.error(error);
    return false;
  }
}

async function runTests() {
  const openaiSuccess = await testOpenAI();
  const langfuseSuccess = await testLangfuse();
  
  console.log('\n--- Test Results ---');
  console.log('OpenAI API: ' + (openaiSuccess ? '✅ Success' : '❌ Failed'));
  console.log('Langfuse API: ' + (langfuseSuccess ? '✅ Success' : '❌ Failed'));
}

runTests(); 