// supabase/functions/classify-image/index.ts

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface ClassificationRequest {
  image_data: string; // data URL
}

interface ClassificationResponse {
  success: boolean;
  predictions: Array<{ class_name: string; confidence: number }>;
  model_used: "gemini";
  diagnosis?: string;
  management?: string;
  postcare?: string;
  advice?: string;
  explanation?: string;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { image_data }: ClassificationRequest = await req.json();

    if (!image_data) return jsonErr("No image data provided", 400);

    const result = await geminiClassification(image_data);
    return json(result);
  } catch (err) {
    console.error("Classification error:", err);
    return jsonErr("Internal server error", 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
function jsonErr(msg: string, status = 500) {
  return json({ success: false, predictions: [], model_used: "gemini", error: msg }, status);
}

// ✅ Gemini dynamic image classification
async function geminiClassification(imageData: string): Promise<ClassificationResponse> {
  try {
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY not set");

    const base64Image = imageData.replace(/^data:image\/[a-z]+;base64,/, "");

    const prompt = `
You are a precise plant pathology AI. Analyze this image and respond strictly in JSON:
{
  "status": "healthy" | "diseased" | "unknown",
  "disease": "string or null",
  "confidence": 0.0-1.0,
  "symptoms": "short description",
  "diagnosis": "brief cause explanation",
  "management": "treatment or control measures",
  "postcare": "follow-up steps",
  "advice": "preventive recommendations"
}
Rules:
- Do not output anything except valid JSON.
- Estimate confidence realistically (0–1).
- Keep responses concise and practical.
`;

    // Use a Gemini model version that supports generateContent for images.
    // Switched from gemini-2.5-flash which returned NOT_FOUND in some environments.
    const geminiModel = `models/gemini-2.5-flash:generateContent`;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${geminiModel}?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inline_data: { mime_type: "image/jpeg", data: base64Image },
                },
              ],
            },
          ],
          generationConfig: { maxOutputTokens: 800 },
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Gemini error:", res.status, text);
      return {
        success: false,
        predictions: [],
        model_used: "gemini",
        error: `Gemini API HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/^[^{[]+/, "").replace(/[^}\]]+$/, "");
      parsed = JSON.parse(cleaned);
    }

    const status = parsed.status || "unknown";
    const disease = parsed.disease || (status === "healthy" ? "Healthy" : "Unknown");
    const conf = typeof parsed.confidence === "number" ? parsed.confidence : 0.8;

    return {
      success: true,
      model_used: "gemini",
      predictions: [{ class_name: disease, confidence: conf }],
      diagnosis: parsed.diagnosis || "",
      management: parsed.management || "",
      postcare: parsed.postcare || "",
      advice: parsed.advice || "",
      explanation: parsed.symptoms || parsed.diagnosis || "",
    };
  } catch (err) {
    console.error("Gemini classification error:", err);
    return {
      success: false,
      predictions: [],
      model_used: "gemini",
      error: "Gemini classification failed",
    };
  }
}
