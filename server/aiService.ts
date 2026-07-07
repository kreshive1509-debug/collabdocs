import { GoogleGenAI } from "@google/genai";

// 1. Define standard interface for any AI Provider to keep the architecture vendor-agnostic.
export interface AIProvider {
  name: string;
  generateText(prompt: string, systemInstruction?: string): Promise<string>;
  generateJSON<T>(prompt: string, systemInstruction?: string): Promise<T>;
}

// 2. Default Google Gemini AI Provider Implementation
export class GeminiProvider implements AIProvider {
  name = "Google Gemini";
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } else {
      console.warn("GEMINI_API_KEY environment variable is not defined. Gemini AI operations will be unavailable.");
    }
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.ai) {
      throw new Error("AI provider initialization failed: GEMINI_API_KEY not configured.");
    }

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });

      return response.text || "No response generated from AI.";
    } catch (e: any) {
      console.error("Gemini text generation failed:", e);
      throw new Error(`AI generation failed: ${e.message || e}`);
    }
  }

  async generateJSON<T>(prompt: string, systemInstruction?: string): Promise<T> {
    if (!this.ai) {
      throw new Error("AI provider initialization failed: GEMINI_API_KEY not configured.");
    }

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "{}";
      return JSON.parse(text) as T;
    } catch (e: any) {
      console.error("Gemini JSON generation failed:", e);
      throw new Error(`AI generation failed: ${e.message || e}`);
    }
  }
}

// 3. Simple AI Factory Service to resolve the active provider
export class AIService {
  private static activeProvider: AIProvider = new GeminiProvider();

  static setProvider(provider: AIProvider) {
    this.activeProvider = provider;
  }

  static getProvider(): AIProvider {
    return this.activeProvider;
  }

  static async generateCompletion(prompt: string, systemInstruction?: string): Promise<string> {
    return this.activeProvider.generateText(prompt, systemInstruction);
  }
}
