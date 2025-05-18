document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const messageInput = document.getElementById('message-input');
  const chatMessages = document.getElementById('chat-messages');
  const sendButton = document.getElementById('send-button');
  const traceDetails = document.getElementById('trace-details');
  
  // Generate a session ID for Langfuse tracing
  const sessionId = generateUUID();
  let currentTraceId = null;

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Disable the input and button while processing
    messageInput.disabled = true;
    sendButton.disabled = true;
    
    // Add user message to the chat
    addMessageToChat('user', message);
    
    // Clear the input
    messageInput.value = '';
    
    // Add a loading message
    const loadingMsgId = addLoadingMessage();
    
    try {
      // Send the message to the API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      const data = await response.json();
      
      // Remove the loading message
      removeLoadingMessage(loadingMsgId);
      
      // Add AI response to the chat
      addMessageToChat('ai', data.message);
      
      // Update trace information
      currentTraceId = data.traceId;
      updateTraceInfo(currentTraceId);
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove the loading message
      removeLoadingMessage(loadingMsgId);
      
      // Add error message
      addMessageToChat('system', 'An error occurred. Please try again.');
    } finally {
      // Re-enable the input and button
      messageInput.disabled = false;
      sendButton.disabled = false;
      messageInput.focus();
    }
  });

  function addMessageToChat(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', role);
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    
    const paragraph = document.createElement('p');
    paragraph.textContent = content;
    
    contentDiv.appendChild(paragraph);
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
    
    traceDetails.innerHTML = `
      <p><strong>Trace ID:</strong> ${traceId}</p>
      <p><strong>Session ID:</strong> ${sessionId}</p>
      <p><a href="https://cloud.langfuse.com/project/production/traces/${traceId}" target="_blank">View in Langfuse Dashboard →</a></p>
    `;
  }

  // Helper function to generate a UUID for session tracking
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}); 