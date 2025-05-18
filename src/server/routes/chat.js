const express = require('express');
const router = express.Router();
const { Langfuse } = require('langfuse-node');
const { OpenAI } = require('openai');

// Initialize Langfuse for tracing
const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post('/', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Create a trace for this conversation
    const trace = langfuse.trace({
      id: sessionId || undefined,
      name: 'chat_conversation',
      metadata: {
        userId: 'anonymous',
      },
    });

    // Log the user's message
    trace.span({
      name: 'user_message',
      input: { message },
    });

    // Create a generation span for the AI response
    const generation = await trace.generation({
      name: 'ai_response',
      model: process.env.OPENAI_MODEL,
      modelParameters: {
        temperature: 0.7,
        max_tokens: 500,
      },
      input: { message },
      async run() {
        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 500,
        });
        
        return completion.choices[0].message.content;
      }
    });

    res.json({
      message: generation.output,
      traceId: trace.id,
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 