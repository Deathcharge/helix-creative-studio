/**
 * Story Continuation Utility
 * Generates follow-up chapters with context from previous stories
 */

import { invokeLLM } from "./_core/llm";
import * as db from "./db";

export interface ContinuationContext {
  previousStory: {
    title: string;
    content: string;
    chapterNumber: number;
  };
  seriesTitle?: string;
  userPrompt?: string;
}

/**
 * Generate a continuation prompt with context from the previous chapter
 */
export async function generateContinuationPrompt(context: ContinuationContext): Promise<string> {
  const { previousStory, seriesTitle, userPrompt } = context;
  
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a creative writing assistant specializing in cyberpunk fiction. Your job is to generate a detailed prompt for the next chapter in a story series.

Guidelines:
- Analyze the previous chapter to extract key characters, plot threads, and world details
- Identify unresolved conflicts and narrative hooks
- Suggest a natural continuation that advances the story
- Maintain consistency with established characters and world-building
- Incorporate the user's direction if provided
- Keep the prompt detailed (80-120 words)`,
      },
      {
        role: "user",
        content: `Generate a prompt for Chapter ${previousStory.chapterNumber + 1} of "${seriesTitle || 'Untitled Series'}".

Previous Chapter: "${previousStory.title}"

${previousStory.content.substring(0, 2000)}${previousStory.content.length > 2000 ? '...' : ''}

${userPrompt ? `User's direction for next chapter: ${userPrompt}` : ''}

Respond with JSON: { "prompt": "...", "suggestedTitle": "...", "keyElements": ["...", "..."] }`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "continuation_prompt",
        strict: true,
        schema: {
          type: "object",
          properties: {
            prompt: { type: "string" },
            suggestedTitle: { type: "string" },
            keyElements: { type: "array", items: { type: "string" } },
          },
          required: ["prompt", "suggestedTitle", "keyElements"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  const contentStr = typeof content === 'string' ? content : '{}';
  const result = JSON.parse(contentStr);

  return result.prompt;
}

/**
 * Extract character and world details from a story for continuity
 */
export async function extractStoryContext(storyContent: string): Promise<{
  characters: string[];
  locations: string[];
  plotThreads: string[];
  tone: string;
}> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a literary analyst. Extract key narrative elements from the given story. Respond in JSON format.",
      },
      {
        role: "user",
        content: `Analyze this story and extract key elements:\n\n${storyContent.substring(0, 3000)}${storyContent.length > 3000 ? '...' : ''}\n\nRespond with JSON: { "characters": ["..."], "locations": ["..."], "plotThreads": ["..."], "tone": "..." }`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "story_context",
        strict: true,
        schema: {
          type: "object",
          properties: {
            characters: { type: "array", items: { type: "string" } },
            locations: { type: "array", items: { type: "string" } },
            plotThreads: { type: "array", items: { type: "string" } },
            tone: { type: "string" },
          },
          required: ["characters", "locations", "plotThreads", "tone"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  const contentStr = typeof content === 'string' ? content : '{}';
  return JSON.parse(contentStr);
}

/**
 * Create a new story series
 */
export function generateSeriesId(): string {
  return `series_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

