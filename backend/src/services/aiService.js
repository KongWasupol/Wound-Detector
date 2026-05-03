import fs from "fs/promises";
import OpenAI from "openai";

const buildPrompt = (notes = "") => `You are a medical and veterinary specialist analyzing an image. The image may show:
- Human wounds or injuries
- Animal health conditions, wounds, or injuries
- General medical conditions

Analyze the image and classify the wound into one of these 4 main types:
- "cut" - Sharp incisions, lacerations, slices from blades/glass
- "burn" - Thermal, chemical, or friction burns
- "scratch" - Surface abrasions, scrapes, shallow skin damage
- "bruise" - Contusions, impact injuries without open wound

If the wound doesn't clearly fit these categories, use "other".

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "woundType": "cut",
  "summary": "A concise 2-3 sentence summary of what you observe - whether it's a wound, animal condition, or other medical issue. Describe appearance, location, and key characteristics",
  "severityScore": 42,
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "insights": [
    {"label": "Observation 1", "detail": "Detailed description"},
    {"label": "Observation 2", "detail": "Detailed description"},
    {"label": "Observation 3", "detail": "Detailed description"}
  ]
}

Severity score should be 0-100 where:
- 0-20: Healthy/minor issue
- 21-45: Mild/moderate concern
- 46-75: Moderate to serious
- 76-100: Critical/severe requiring immediate attention

Clinician notes: ${notes || "None provided"}`;

const parseJson = (raw) => {
  try {
    // Try to extract JSON from markdown code blocks if present
    let jsonStr = raw.trim();

    // Remove markdown code blocks
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // Try to find JSON object in the string
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (!parsed.summary || typeof parsed.severityScore !== 'number') {
      throw new Error("Missing required fields");
    }

    return parsed;
  } catch (error) {
    console.warn("[aiService] JSON parse failed, using fallback:", error.message);
    // Extract summary from raw text if possible
    const summary = raw.length > 0 ? raw.slice(0, 400) : "Unable to parse AI response.";
    return {
      summary: summary,
      severityScore: 50,
      recommendations: ["Review wound image manually.", "Retry analysis if needed."],
      insights: [
        { label: "Parse Error", detail: "AI response format was unexpected." },
        { label: "Raw Response", detail: raw.slice(0, 100) + "..." }
      ],
    };
  }
};

const stubResult = () => ({
  woundType: "scratch",
  summary:
    "Simulated OpenAI Vision analysis. Provide a valid OPENAI_API_KEY for live insights.",
  severityScore: 42,
  recommendations: [
    "Clean wound gently and keep area dry.",
    "Schedule specialist review within 48 hours.",
  ],
  insights: [
    { label: "Edge definition", detail: "Mild irregular borders detected." },
    { label: "Coloration", detail: "Signs of yellow fibrin near center." },
    { label: "Inflammation", detail: "Red halo suggests low-grade inflammation." },
  ],
});

const buildComparisonPrompt = (notes = "") => `You are a veterinary and medical specialist comparing two images of a wound to assess healing progress.
Image 1: Previous state of the wound.
Image 2: Latest state of the wound (Current).

Analyze the PROGESS based on visual comparison:
1. Identify if the wound from Image 1 is still present in Image 2.
2. If the wound is NOT visible or looks like normal skin/fur in Image 2, conclude it is HEALED or significantly improved.
3. Compare size, inflammation, color, and closure.
4. If Image 2 shows a different wound or unrelated area, note that.

Classify the wound type based on the LATEST image.
- "cut", "burn", "scratch", "bruise", "other".
- If healed, use "other" or original type.

Return ONLY valid JSON with this structure:
{
  "woundType": "cut",
  "summary": "Comparison summary: State clearly if the wound is IMPROVING, WORSENING, or STABLE. Describe changes in size, redness, and closure.",
  "severityScore": 30,
  "recommendations": ["Recommendation based on current state"],
  "insights": [
    {"label": "Progress Status", "detail": "Improving / Worsening / Stable / Healed"},
    {"label": "Change Observed", "detail": "e.g. Size reduced by 50%, Redness gone"},
    {"label": "Current State", "detail": "Description of current appearance"}
  ]
}

Severity Guidelines:
- 0-10: Fully healed or healthy skin
- 11-30: Minor healing marks / scabs
- 31-100: Active wound (rate as usual)

Clinician notes: ${notes || "None provided"}`;

export const analyzeWound = async ({ imagePath, notes, model = "gpt-4o", previousImagePath = null }) => {
  const isComparison = !!previousImagePath;
  const prompt = isComparison ? buildComparisonPrompt(notes) : buildPrompt(notes);

  if (!process.env.OPENAI_API_KEY) {
    if (isComparison) {
      console.warn("[aiService] OPENAI_API_KEY missing, returning stub comparison");
      return { ...stubResult(), summary: "Stub comparison: Wound appears to be healing. (No API Key)" };
    }
    console.warn("[aiService] OPENAI_API_KEY not configured, using stub result");
    return stubResult();
  }

  // Validate model
  const validModels = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"];
  const selectedModel = validModels.includes(model) ? model : "gpt-4o";

  try {
    // Read current image
    const imageBuffer = await fs.readFile(imagePath);
    const imageBase64 = imageBuffer.toString("base64");
    const ext = imagePath.split('.').pop()?.toLowerCase();
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const messagesContent = [
      { type: "text", text: prompt }
    ];

    // If comparison, add previous image first (Image 1)
    if (isComparison) {
      try {
        const prevBuffer = await fs.readFile(previousImagePath);
        const prevBase64 = prevBuffer.toString("base64");
        const prevExt = previousImagePath.split('.').pop()?.toLowerCase();
        const prevMime = prevExt === 'png' ? 'image/png' : 'image/jpeg';

        messagesContent.push({
          type: "image_url",
          image_url: { url: `data:${prevMime};base64,${prevBase64}`, detail: "high" }
        });
      } catch (err) {
        console.warn("[aiService] Failed to read previous image for comparison:", err.message);
        // Fallback to single image analysis if prev image fails
      }
    }

    // Add current image (Image 2)
    messagesContent.push({
      type: "image_url",
      image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "high" }
    });

    const response = await client.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: "user",
          content: messagesContent
        }
      ],
      max_tokens: 1000,
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error("No response content from OpenAI");
    }

    console.log("[aiService] OpenAI analysis successful");
    return parseJson(text);

  } catch (error) {
    console.error("[aiService] OpenAI analysis failed:", error.message);
    console.error("[aiService] Error details:", error);
    // Return stub on error so user still sees something
    return stubResult();
  }
};

