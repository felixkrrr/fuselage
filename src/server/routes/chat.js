const express = require('express');
const router = express.Router();
const { Langfuse } = require('langfuse-node');
const { OpenAI } = require('openai');

// Initialize Langfuse for tracing
const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'
});

// Store active sessions and conversations
const sessions = new Map();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post('/', async (req, res) => {
  try {
    const { message, sessionId, isSessionInit, userAgent, timestamp, messageIndex } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Session handling
    let sessionData;
    if (sessions.has(sessionId)) {
      sessionData = sessions.get(sessionId);
      console.log(`Retrieved existing session ${sessionId} with trace ${sessionData.traceId}`);
    } else {
      // Create a new session
      sessionData = {
        traceId: `trace-${sessionId}`,
        messages: [],
        startTime: Date.now(),
        userAgent: userAgent || 'unknown'
      };
      sessions.set(sessionId, sessionData);
      console.log(`Created new session ${sessionId} with trace ${sessionData.traceId}`);
    }

    // Create or retrieve trace using the session's trace ID
    const trace = langfuse.trace({
      id: sessionData.traceId,
      name: 'chat_session',
      sessionId: sessionId, // Explicitly set sessionId property
      metadata: {
        userId: 'anonymous',
        source: 'fuselage-chat-app',
        sessionStartTime: new Date(parseInt(sessionId.split('-')[0])).toISOString(),
        userAgent: sessionData.userAgent,
        sessionIdRaw: sessionId
      },
    });

    // Handle session initialization
    if (isSessionInit) {
      console.log(`Initializing session ${sessionId}`);
      
      // Create a session initialization event
      trace.event({
        name: 'session_start',
        level: 'INFO',
        sessionId: sessionId, // Explicitly include sessionId
        metadata: {
          timestamp: timestamp || Date.now(),
          userAgent: userAgent || 'unknown'
        }
      });

      // Return early with just the trace ID
      return res.json({
        message: 'Session initialized',
        traceId: sessionData.traceId,
      });
    }

    console.log(`Processing message: "${message}" for session: ${sessionId}`);

    // Update session message history
    sessionData.messages.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    // Log the user's message as a span
    const userMessageSpan = trace.span({
      name: 'user_message',
      input: { message },
      sessionId: sessionId, // Explicitly include sessionId
      metadata: {
        messageIndex: messageIndex || 0,
        timestamp: Date.now(),
        messagesInSession: sessionData.messages.length
      }
    });
    userMessageSpan.end(); // Make sure to end the span

    // Skip AI processing for initialization message
    if (message === '_session_init_') {
      return res.json({
        message: 'Session initialized',
        traceId: sessionData.traceId,
      });
    }

    // Get AI response - direct approach
    let aiResponse = '';
    
    try {
      console.log("Calling OpenAI API directly...");
      
      // Create proper conversation history for context
      const messages = [
        { role: 'system', content: 'You are a helpful assistant.' }
      ];
      
      // Add relevant conversation history (last 5 messages)
      const historyMessages = sessionData.messages
        .slice(-5) // Get last 5 messages
        .map(msg => ({ role: msg.role, content: msg.content }));
      
      messages.push(...historyMessages);
      
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      });
      
      console.log("OpenAI response received.");
      aiResponse = completion.choices[0].message.content;
      
      // Update session history with AI response
      sessionData.messages.push({
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now()
      });
      
      // Log the generation to Langfuse after we have the response
      const generation = trace.generation({
        name: 'ai_response',
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        modelParameters: {
          temperature: 0.7,
          max_tokens: 500,
        },
        input: { 
          message,
          sessionId: sessionId 
        },
        output: aiResponse,
        sessionId: sessionId, // Explicitly include sessionId
        metadata: {
          messageIndex: messageIndex ? messageIndex + 1 : 1,
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
          totalTokens: completion.usage?.total_tokens,
          timestamp: Date.now(),
          messagesInSession: sessionData.messages.length
        }
      });
      
      console.log(`Logged generation to Langfuse, AI response: ${aiResponse.substring(0, 50)}...`);
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      aiResponse = "Sorry, I encountered an error. Please try again later.";
      
      // Log the error to Langfuse
      trace.event({
        name: 'openai_error',
        level: 'ERROR',
        sessionId: sessionId, // Explicitly include sessionId
        metadata: {
          error: error.message,
          messageIndex: messageIndex || 0,
          timestamp: Date.now(),
          sessionId: sessionId
        }
      });
    }

    // Update the trace with output and session information
    await trace.update({
      output: { response: aiResponse },
      sessionId: sessionId, // Explicitly include sessionId
      metadata: {
        messagesInSession: sessionData.messages.length,
        sessionDuration: Date.now() - sessionData.startTime
      }
    });

    // Return complete response to client
    console.log("Sending response to client");
    res.json({
      message: aiResponse,
      traceId: sessionData.traceId,
      sessionMessages: sessionData.messages.length
    });
    
  } catch (error) {
    console.error('Error in chat route:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 