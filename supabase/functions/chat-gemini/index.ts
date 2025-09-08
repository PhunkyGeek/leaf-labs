const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface ChatRequest {
  message: string
  conversation_history?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

interface ChatResponse {
  success: boolean
  response: string
  error?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { message, conversation_history = [] }: ChatRequest = await req.json();

    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No message provided',
          response: ''
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Gemini API key not configured',
          response: ''
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Build system prompt for plant health assistant
    const systemPrompt = `You are an expert plant health assistant specializing in plant disease identification, treatment, and care. You have extensive knowledge about:

- Plant diseases (fungal, bacterial, viral)
- Treatment methods (organic and chemical)
- Prevention strategies
- Plant care and maintenance
- Seasonal plant health management
- Soil health and nutrition
- Pest control
- Watering and fertilization schedules

Provide detailed, practical, and actionable advice. Be conversational and helpful. If asked about specific diseases, provide comprehensive information including symptoms, causes, treatment options, and prevention methods.`;

    // Build conversation contents for Gemini API
    const contents = [];
    
    // Add system prompt as first message
    contents.push({
      role: "user",
      parts: [{ text: systemPrompt }]
    });
    contents.push({
      role: "model",
      parts: [{ text: "I understand. I'm ready to help with plant health questions, disease identification, and care advice. What would you like to know?" }]
    });

    // Add conversation history
    conversation_history.slice(-6).forEach(msg => {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    });

    // Add current message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey,
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    
    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      throw new Error('No response generated from Gemini');
    }

    const responseText = geminiData.candidates[0].content.parts[0].text;

    return new Response(
      JSON.stringify({
        success: true,
        response: responseText.trim()
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to generate response',
        response: 'I apologize, but I encountered an error. Please try again or rephrase your question.'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});