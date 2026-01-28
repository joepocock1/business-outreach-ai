import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateVariationsInput {
  masterSubject: string;
  masterBody: string;
  tone: string;
  targetIndustry: string | null;
  userName: string;
  businessName: string;
  portfolioUrl: string;
}

interface EmailVariation {
  variationName: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  copywritingFramework: string;
  estimatedLength: number;
  toneAnalysis: string;
}

export async function generateEmailVariations(
  input: GenerateVariationsInput
): Promise<EmailVariation[]> {
  const prompt = `You are an expert email copywriter. Generate 5 cold email variations for a web development freelancer reaching out to local businesses without websites.

MASTER TEMPLATE:
Subject: ${input.masterSubject}
Body: ${input.masterBody}

BUSINESS CONTEXT:
- Sender: ${input.userName} from ${input.businessName}
- Portfolio: ${input.portfolioUrl || "[portfolio URL]"}
- Target: ${input.targetIndustry || "local"} businesses in Cardiff
- Desired tone: ${input.tone}

REQUIREMENTS:
Create 5 variations using these frameworks:
1. PAS (Problem-Agitate-Solution) - Start with the problem, amplify the pain, offer solution
2. AIDA (Attention-Interest-Desire-Action) - Grab attention, build interest, create desire, call to action
3. BAB (Before-After-Bridge) - Paint the current state, show the future, bridge with your solution
4. FAB (Feature-Advantage-Benefit) - State feature, explain advantage, describe benefit
5. Direct (Straightforward value proposition) - Get right to the point with clear value

Each variation must:
- Keep subject under 50 characters
- Body between 80-150 words
- Include clear CTA (call to action)
- Feel human and authentic (not salesy)
- Use {{businessName}} and {{contactName}} variables for personalization
- Maintain the core message but vary structure and approach

Return as JSON array with this exact format:
[
  {
    "variationName": "PAS Format",
    "subject": "the email subject",
    "bodyText": "plain text email body",
    "bodyHtml": "HTML formatted email body with <p> tags",
    "copywritingFramework": "PAS",
    "estimatedLength": 120,
    "toneAnalysis": "professional with empathy"
  }
]

Return ONLY the JSON array, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract the text content
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in response");
    }

    // Parse the JSON response
    const jsonText = textContent.text.trim();
    // Handle potential markdown code blocks
    const cleanJson = jsonText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const variations = JSON.parse(cleanJson) as EmailVariation[];

    // Validate and ensure all required fields exist
    return variations.map((v) => ({
      variationName: v.variationName || "Unnamed Variation",
      subject: v.subject || input.masterSubject,
      bodyHtml: v.bodyHtml || `<p>${v.bodyText}</p>`,
      bodyText: v.bodyText || v.bodyHtml?.replace(/<[^>]*>/g, "") || "",
      copywritingFramework: v.copywritingFramework || "Direct",
      estimatedLength:
        v.estimatedLength || v.bodyText?.split(/\s+/).length || 100,
      toneAnalysis: v.toneAnalysis || input.tone,
    }));
  } catch (error) {
    console.error("AI generation error:", error);
    throw new Error("Failed to generate email variations");
  }
}

export async function generateInsights(data: {
  emailsSent: number;
  openRate: number;
  replyRate: number;
  topVariations: Array<{
    name: string;
    framework: string;
    replyRate: number;
  }>;
  sendTimeStats: Array<{
    dayOfWeek: string;
    hour: number;
    replyRate: number;
  }>;
}): Promise<
  Array<{
    type: string;
    title: string;
    description: string;
    confidence: number;
  }>
> {
  const prompt = `Analyze this email campaign data and provide actionable insights.

DATA:
- Total emails sent: ${data.emailsSent}
- Overall open rate: ${data.openRate}%
- Overall reply rate: ${data.replyRate}%
- Top performing variations: ${JSON.stringify(data.topVariations)}
- Send time performance: ${JSON.stringify(data.sendTimeStats)}

Generate 3-5 insights in this JSON format:
[
  {
    "type": "best_variation" | "optimal_send_time" | "subject_line_pattern" | "industry_preference",
    "title": "Short insight title",
    "description": "Detailed explanation with specific recommendations",
    "confidence": 0.85
  }
]

Focus on actionable recommendations. Only include insights with confidence > 0.6.
Return ONLY the JSON array.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in response");
    }

    const cleanJson = textContent.text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("AI insights error:", error);
    return [];
  }
}
