document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const messageInput = document.getElementById('message-input');
  const chatMessages = document.getElementById('chat-messages');
  const sendButton = document.getElementById('send-button');
  const traceDetails = document.getElementById('trace-details');
  
  // Generate a session ID based on timestamp for Langfuse tracing
  const sessionId = generateSessionId();
  let currentTraceId = null;
  let messageHistory = [];
  let sessionMessages = 0;

  console.log(`New session started with ID: ${sessionId}`);

  // Add initial system message
  addMessageToChat('system', 'Welcome to Fuselage Chat! This app demonstrates Langfuse tracing with OpenAI. Ask me anything!');

  // Initialize session in Langfuse by sending an initial request
  initializeSession();

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Disable the input and button while processing
    messageInput.disabled = true;
    sendButton.disabled = true;
    
    // Add user message to the chat
    addMessageToChat('user', message);
    
    // Store in message history
    messageHistory.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });
    
    // Clear the input
    messageInput.value = '';
    
    // Add a loading message
    const loadingMsgId = addLoadingMessage();
    
    try {
      console.log('Sending message to API:', message);
      // Send the message to the API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId,
          messageIndex: messageHistory.length - 1,
          timestamp: Date.now()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      // Remove the loading message
      removeLoadingMessage(loadingMsgId);
      
      if (data.message) {
        // Add AI response to the chat
        addMessageToChat('ai', data.message);
        
        // Store in message history
        messageHistory.push({
          role: 'assistant',
          content: data.message,
          timestamp: Date.now()
        });
        
        // Update session message count if available
        if (data.sessionMessages) {
          sessionMessages = data.sessionMessages;
        }
      } else {
        // If no message in response
        addMessageToChat('system', 'No response received from the AI. Please try again.');
      }
      
      // Update trace information
      currentTraceId = data.traceId;
      updateTraceInfo(currentTraceId);
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove the loading message
      removeLoadingMessage(loadingMsgId);
      
      // Add error message
      addMessageToChat('system', `An error occurred: ${error.message}`);
    } finally {
      // Re-enable the input and button
      messageInput.disabled = false;
      sendButton.disabled = false;
      messageInput.focus();
    }
  });

  // Initialize the session by sending a session_start event to the server
  async function initializeSession() {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: '_session_init_',
          sessionId,
          isSessionInit: true,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.traceId) {
          currentTraceId = data.traceId;
          updateTraceInfo(currentTraceId);
          console.log(`Session initialized with trace ID: ${currentTraceId}`);
        }
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  }

  function addMessageToChat(role, content) {
    // Don't display session initialization message
    if (content === '_session_init_') return;
    
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', role);
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    
    // Handle multi-line messages
    const contentLines = content.split('\n');
    contentLines.forEach((line, index) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      contentDiv.appendChild(paragraph);
      
      // Add spacing between paragraphs
      if (index < contentLines.length - 1) {
        contentDiv.appendChild(document.createElement('br'));
      }
    });
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to the bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addLoadingMessage() {
    const id = 'loading-' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'ai');
    messageDiv.id = id;
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Thinking...';
    
    contentDiv.appendChild(paragraph);
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to the bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return id;
  }

  function removeLoadingMessage(id) {
    const loadingMessage = document.getElementById(id);
    if (loadingMessage) {
      chatMessages.removeChild(loadingMessage);
    }
  }

  function updateTraceInfo(traceId) {
    if (!traceId) return;
    
    const langfuseUrl = 'https://cloud.langfuse.com';
    const sessionStartTime = new Date(parseInt(sessionId.split('-')[0]));
    const formattedTime = sessionStartTime.toLocaleString();
    const sessionDuration = Math.round((Date.now() - sessionStartTime) / 1000);
    
    traceDetails.innerHTML = `
      <p><strong>Trace ID:</strong> ${traceId}</p>
      <p><strong>Session ID:</strong> ${sessionId}</p>
      <p><strong>Session Start:</strong> ${formattedTime}</p>
      <p><strong>Session Duration:</strong> ${formatDuration(sessionDuration)}</p>
      <p><strong>Messages in Session:</strong> ${sessionMessages || messageHistory.length}</p>
      <p><a href="${langfuseUrl}/project/production/traces/${traceId}" target="_blank">View in Langfuse Dashboard →</a></p>
      <p class="help-text">Note: Trace data might take a few seconds to appear in Langfuse.</p>
    `;
  }

  // Format duration in seconds to a readable format
  function formatDuration(seconds) {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} min ${remainingSeconds} sec`;
  }

  // Generate a session ID based on timestamp plus random suffix
  function generateSessionId() {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${timestamp}-${randomSuffix}`;
  }
}); 