# Fuselage Chat

A simple ChatGPT-like application built to test [Langfuse](https://langfuse.com) tracing. This application lets you chat with an AI assistant while capturing detailed tracing information in Langfuse.

## Features

- Simple and intuitive chat interface
- OpenAI integration for AI responses
- Langfuse integration for LLM observability and tracing
- Session tracking to group related messages
- Real-time display of trace information

## Prerequisites

- Node.js (v14 or higher)
- An OpenAI API key
- A Langfuse account and API keys

## Setup

1. Clone this repository:
   ```
   git clone https://github.com/your-username/fuselage.git
   cd fuselage
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   # OpenAI API configuration
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-3.5-turbo

   # Server configuration
   PORT=3000

   # Langfuse configuration
   LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
   LANGFUSE_SECRET_KEY=your_langfuse_secret_key
   LANGFUSE_HOST=https://cloud.langfuse.com
   ```

4. Replace the placeholder values with your actual API keys.

## Running the Application

Start the development server:
```
npm run dev
```

The application will be available at http://localhost:3000.

## Usage

1. Open the application in your browser
2. Type a message in the input field and press "Send"
3. View the AI response in the chat window
4. See the trace information in the sidebar
5. Click the link to view detailed tracing in the Langfuse dashboard

## Viewing Traces in Langfuse

Each conversation creates a trace in Langfuse with spans for:
- User messages
- AI generations

You can view these traces in the Langfuse dashboard to analyze performance, errors, and other metrics.

## License

MIT 