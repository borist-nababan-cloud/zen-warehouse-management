Role: Senior Frontend Engineer (React, Vite).
Task: Implement the AI Chatbot Widget connecting to our Custom Backend.
Context:
We have deployed a custom Node.js backend to secure our API keys.
Backend URL: (You will need to insert your Coolify URL here, e.g., https://ai-backend.nababancloud.com/ask-ai).
Frontend Stack: React, Tailwind CSS.
Implementation Requirements:
Component: AIChatWidget.tsx
UI: Same floating bubble design as discussed.
API Call Logic (Crucial Change):
Instead of supabase.functions.invoke, use standard fetch.
code
TypeScript
// In handleSubmit
const response = await fetch('https://YOUR-COOLIFY-BACKEND-URL/ask-ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userInput,
    contextData: props.contextData,
    pageName: props.pageName
  })
});

const data = await response.json();
// data.reply contains the markdown answer
Environment Variable:
Add VITE_AI_BACKEND_URL to your .env file so we don't hardcode the URL.
Use import.meta.env.VITE_AI_BACKEND_URL in the fetch call.
Visuals:
Use react-markdown to render the response.
Handle loading states gracefully.
Action:
Generate the code for AIChatWidget.tsx.