import OpenAI from 'openai';
import { AIClient, AIConfidence, AI_CONFIDENCE } from './types';
import { buildMatchIngredientPrompt } from './prompt';

const { HIGH, LOW } = AI_CONFIDENCE;

export class OpenAIClient implements AIClient {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async matchIngredient(
    name: string,
    candidates: string[],
  ): Promise<{ match: string | null; confidence: AIConfidence }> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 100,
      messages: [{ role: 'user', content: buildMatchIngredientPrompt(name, candidates) }],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { match: null, confidence: LOW };

    const parsed = JSON.parse(content) as {
      match: string | null;
      confidence: AIConfidence;
    };
    return {
      match: parsed.match ?? null,
      confidence: parsed.confidence === HIGH ? HIGH : LOW,
    };
  }
}
