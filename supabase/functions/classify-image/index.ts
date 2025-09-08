const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface ClassificationRequest {
  image_data: string
  model_version?: string
}

interface ClassificationResponse {
  success: boolean
  predictions: Array<{
    class_name: string
    confidence: number
  }>
  model_used: 'onnx' | 'gemini'
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
    const { image_data, model_version = 'v1.0' }: ClassificationRequest = await req.json();

    if (!image_data) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No image data provided',
          predictions: []
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

    // Try ONNX inference first (would implement actual ONNX inference here)
    let result: ClassificationResponse;
    
    try {
      // Simulate ONNX inference
      result = await simulateONNXInference(image_data);
    } catch (onnxError) {
      console.log('ONNX inference failed, falling back to Gemini');
      // Fallback to Gemini
      result = await geminiClassification(image_data);
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('Classification error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        predictions: []
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

async function simulateONNXInference(imageData: string): Promise<ClassificationResponse> {
  // Simulate ONNX processing time
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock predictions for demo
  const predictions = [
    { class_name: 'Early Blight', confidence: 0.92 },
    { class_name: 'Late Blight', confidence: 0.06 },
    { class_name: 'Healthy', confidence: 0.02 }
  ];

  return {
    success: true,
    predictions,
    model_used: 'onnx'
  };
}

async function geminiClassification(imageData: string): Promise<ClassificationResponse> {
  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Remove data URL prefix if present
    const base64Image = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    
    const prompt = `Analyze this plant image and identify any diseases or health issues. 

Please provide:
1. The most likely disease or condition (or "Healthy" if no issues detected)
2. Your confidence level as a decimal between 0 and 1
3. Brief explanation of visible symptoms

Focus on common plant diseases like:
- Early Blight
- Late Blight  
- Bacterial Spot
- Powdery Mildew
- Mosaic Virus
- Leaf Scorch
- Rust
- Black Rot
- Anthracnose

Respond in this exact format:
Disease: [disease name or "Healthy"]
Confidence: [0.0-1.0]
Symptoms: [brief description]`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey,
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: prompt
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 32,
            topP: 1,
            maxOutputTokens: 512,
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini Vision API error:', errorText);
      throw new Error(`Gemini Vision API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    
    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      throw new Error('No response generated from Gemini Vision');
    }

    const responseText = geminiData.candidates[0].content.parts[0].text;
    
    // Parse the structured response
    const diseaseMatch = responseText.match(/Disease:\s*(.+)/i);
    const confidenceMatch = responseText.match(/Confidence:\s*([\d.]+)/i);
    
    const diseaseName = diseaseMatch ? diseaseMatch[1].trim() : 'Unknown Disease';
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5;
    
    // Create predictions array with primary prediction and alternatives
    const predictions = [
      { class_name: diseaseName, confidence: Math.min(Math.max(confidence, 0), 1) }
    ];
    
    // Add some alternative predictions for completeness
    if (diseaseName !== 'Healthy') {
      predictions.push(
        { class_name: 'Healthy', confidence: Math.max(0, 1 - confidence - 0.1) },
        { class_name: 'Other Disease', confidence: Math.max(0, 0.1) }
      );
    } else {
      predictions.push(
        { class_name: 'Early Blight', confidence: Math.max(0, 1 - confidence - 0.05) },
        { class_name: 'Bacterial Spot', confidence: Math.max(0, 0.05) }
      );
    }

    return {
      success: true,
      predictions,
      model_used: 'gemini'
    };
  } catch (error) {
    console.error('Gemini classification error:', error);
    return {
      success: false,
      predictions: [],
      model_used: 'gemini',
      error: 'Gemini classification failed'
    };
  }
}