/**
 * Prompt Enhancement Utility
 * Automatically condenses, expands, and enriches user prompts for better story generation
 */

import { invokeLLM } from "./_core/llm";

export interface EnhancedPrompt {
  original: string;
  enhanced: string;
  detectedGenre: string;
  detectedTone: string;
  suggestedThemes: string[];
  wordCount: number;
}

/**
 * Enhance a user prompt with genre detection, theme extraction, and expansion
 */
export async function enhancePrompt(prompt: string): Promise<EnhancedPrompt> {
  // If prompt is already detailed (>100 words), just analyze it
  const wordCount = prompt.split(/\s+/).length;
  
  if (wordCount > 100) {
    return analyzeDetailedPrompt(prompt);
  }
  
  // For short prompts, expand them
  return expandShortPrompt(prompt);
}

/**
 * Analyze a detailed prompt without expanding it
 */
async function analyzeDetailedPrompt(prompt: string): Promise<EnhancedPrompt> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a literary analyst. Analyze the given story prompt and extract genre, tone, and themes. Respond in JSON format.",
      },
      {
        role: "user",
        content: `Analyze this story prompt:\n\n${prompt}\n\nRespond with JSON: { "genre": "...", "tone": "...", "themes": ["...", "..."] }`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "prompt_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            genre: { type: "string" },
            tone: { type: "string" },
            themes: { type: "array", items: { type: "string" } },
          },
          required: ["genre", "tone", "themes"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  const contentStr = typeof content === 'string' ? content : '{}';
  const analysis = JSON.parse(contentStr);

  return {
    original: prompt,
    enhanced: prompt, // Keep as-is for detailed prompts
    detectedGenre: analysis.genre || "Cyberpunk",
    detectedTone: analysis.tone || "Dark",
    suggestedThemes: analysis.themes || [],
    wordCount: prompt.split(/\s+/).length,
  };
}

/**
 * Expand a short prompt into a more detailed version
 */
async function expandShortPrompt(prompt: string): Promise<EnhancedPrompt> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a creative writing assistant specializing in cyberpunk fiction. Your job is to expand brief story ideas into detailed, evocative prompts while preserving the user's core concept.

Guidelines:
- Add vivid cyberpunk setting details (neon cities, augmented reality, corporate dystopia)
- Introduce character motivations and conflicts
- Suggest thematic depth (identity, consciousness, power, rebellion)
- Keep the expansion to 50-80 words
- Maintain the user's original intent
- Use active, engaging language`,
      },
      {
        role: "user",
        content: `Expand this story idea into a detailed cyberpunk prompt:\n\n"${prompt}"\n\nRespond with JSON: { "enhanced": "...", "genre": "...", "tone": "...", "themes": ["...", "..."] }`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "prompt_expansion",
        strict: true,
        schema: {
          type: "object",
          properties: {
            enhanced: { type: "string" },
            genre: { type: "string" },
            tone: { type: "string" },
            themes: { type: "array", items: { type: "string" } },
          },
          required: ["enhanced", "genre", "tone", "themes"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  const contentStr = typeof content === 'string' ? content : '{}';
  const expansion = JSON.parse(contentStr);

  return {
    original: prompt,
    enhanced: expansion.enhanced || prompt,
    detectedGenre: expansion.genre || "Cyberpunk",
    detectedTone: expansion.tone || "Dark",
    suggestedThemes: expansion.themes || [],
    wordCount: (expansion.enhanced || prompt).split(/\s+/).length,
  };
}

/**
 * Quick prompt templates for common cyberpunk themes
 */
export const PROMPT_TEMPLATES = {
  hacker: "A skilled hacker in a neon-lit megacity discovers {secret} and must {action} before {threat}.",
  detective: "An augmented detective investigates {mystery} in a city where {twist}.",
  rebel: "A street samurai protects {target} from {antagonist} while navigating {conflict}.",
  memory: "A memory trader finds {artifact} containing {revelation}, forcing them to {choice}.",
  ai: "An AI {role} questions its existence when {trigger}, leading to {consequence}.",
};

/**
 * Apply a template to a simple prompt
 */
export function applyTemplate(templateKey: keyof typeof PROMPT_TEMPLATES, variables: Record<string, string>): string {
  let template = PROMPT_TEMPLATES[templateKey];
  
  for (const [key, value] of Object.entries(variables)) {
    template = template.replace(`{${key}}`, value);
  }
  
  return template;
}

