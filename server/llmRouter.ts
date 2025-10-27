/**
 * Multi-LLM Router
 * Supports OpenAI, Anthropic, xAI (Grok), Google (Gemini), and Perplexity
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type LLMProvider = "openai" | "anthropic" | "xai" | "google" | "perplexity";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  provider: LLMProvider;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// xAI Grok uses OpenAI-compatible API
const xai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const perplexity = new OpenAI({
  apiKey: process.env.SONAR_API_KEY,
  baseURL: "https://api.perplexity.ai",
});

/**
 * Default model mappings for each provider
 */
export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  openai: "gpt-4-turbo-preview",
  anthropic: "claude-3-5-sonnet-20241022",
  xai: "grok-beta",
  google: "gemini-2.0-flash-exp",
  perplexity: "sonar-pro",
};

/**
 * Route LLM request to appropriate provider
 */
export async function callLLM(
  provider: LLMProvider,
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<LLMResponse> {
  const { temperature = 0.7, maxTokens = 2000, stream = false } = options;

  try {
    switch (provider) {
      case "openai":
        return await callOpenAI(messages, temperature, maxTokens);
      
      case "anthropic":
        return await callAnthropic(messages, temperature, maxTokens);
      
      case "xai":
        return await callXAI(messages, temperature, maxTokens);
      
      case "google":
        return await callGemini(messages, temperature, maxTokens);
      
      case "perplexity":
        return await callPerplexity(messages, temperature, maxTokens);
      
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    console.error(`[LLM Router] Error calling ${provider}:`, error);
    throw error;
  }
}

/**
 * OpenAI (GPT-4)
 */
async function callOpenAI(
  messages: LLMMessage[],
  temperature: number,
  maxTokens: number
): Promise<LLMResponse> {
  const response = await openai.chat.completions.create({
    model: DEFAULT_MODELS.openai,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    temperature,
    max_tokens: maxTokens,
  });

  const choice = response.choices[0];
  if (!choice?.message?.content) {
    throw new Error("No content in OpenAI response");
  }

  return {
    content: choice.message.content,
    provider: "openai",
    model: response.model,
    usage: {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    },
  };
}

/**
 * Anthropic (Claude)
 */
async function callAnthropic(
  messages: LLMMessage[],
  temperature: number,
  maxTokens: number
): Promise<LLMResponse> {
  // Separate system message from conversation
  const systemMessage = messages.find(m => m.role === "system");
  const conversationMessages = messages.filter(m => m.role !== "system");

  const response = await anthropic.messages.create({
    model: DEFAULT_MODELS.anthropic,
    system: systemMessage?.content || "",
    messages: conversationMessages.map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
    temperature,
    max_tokens: maxTokens,
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected content type from Anthropic");
  }

  return {
    content: content.text,
    provider: "anthropic",
    model: response.model,
    usage: {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    },
  };
}

/**
 * xAI (Grok)
 */
async function callXAI(
  messages: LLMMessage[],
  temperature: number,
  maxTokens: number
): Promise<LLMResponse> {
  const response = await xai.chat.completions.create({
    model: DEFAULT_MODELS.xai,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    temperature,
    max_tokens: maxTokens,
  });

  const choice = response.choices[0];
  if (!choice?.message?.content) {
    throw new Error("No content in xAI response");
  }

  return {
    content: choice.message.content,
    provider: "xai",
    model: response.model,
    usage: {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    },
  };
}

/**
 * Google (Gemini)
 */
async function callGemini(
  messages: LLMMessage[],
  temperature: number,
  maxTokens: number
): Promise<LLMResponse> {
  const model = gemini.getGenerativeModel({ 
    model: DEFAULT_MODELS.google,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  });

  // Convert messages to Gemini format
  const systemMessage = messages.find(m => m.role === "system");
  const conversationMessages = messages.filter(m => m.role !== "system");

  const chat = model.startChat({
    history: conversationMessages.slice(0, -1).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    systemInstruction: systemMessage?.content,
  });

  const lastMessage = conversationMessages[conversationMessages.length - 1];
  const result = await chat.sendMessage(lastMessage.content);
  const response = result.response;

  return {
    content: response.text(),
    provider: "google",
    model: DEFAULT_MODELS.google,
    usage: {
      promptTokens: response.usageMetadata?.promptTokenCount || 0,
      completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: response.usageMetadata?.totalTokenCount || 0,
    },
  };
}

/**
 * Perplexity (Sonar)
 */
async function callPerplexity(
  messages: LLMMessage[],
  temperature: number,
  maxTokens: number
): Promise<LLMResponse> {
  const response = await perplexity.chat.completions.create({
    model: DEFAULT_MODELS.perplexity,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    temperature,
    max_tokens: maxTokens,
  });

  const choice = response.choices[0];
  if (!choice?.message?.content) {
    throw new Error("No content in Perplexity response");
  }

  return {
    content: choice.message.content,
    provider: "perplexity",
    model: response.model,
    usage: {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    },
  };
}

/**
 * Test all LLM providers
 */
export async function testAllProviders(): Promise<Record<LLMProvider, boolean>> {
  const results: Record<LLMProvider, boolean> = {
    openai: false,
    anthropic: false,
    xai: false,
    google: false,
    perplexity: false,
  };

  const testMessage: LLMMessage[] = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Say 'OK' if you can hear me." },
  ];

  for (const provider of Object.keys(results) as LLMProvider[]) {
    try {
      const response = await callLLM(provider, testMessage, { maxTokens: 10 });
      results[provider] = response.content.length > 0;
      console.log(`[LLM Router] ${provider}: ✓`);
    } catch (error) {
      console.error(`[LLM Router] ${provider}: ✗`, error);
      results[provider] = false;
    }
  }

  return results;
}

