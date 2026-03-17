import Anthropic from '@anthropic-ai/sdk';
import { AIClient, AIConfidence, AI_CONFIDENCE } from './types';
import { buildMatchIngredientPrompt } from './prompt';

const { HIGH, LOW } = AI_CONFIDENCE;

export class AnthropicClient implements AIClient {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async matchIngredient(
    name: string,
    candidates: string[],
  ): Promise<{ match: string | null; confidence: AIConfidence }> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{ role: 'user', content: buildMatchIngredientPrompt(name, candidates) }],
    });

    const content = response.content[0];
    if (content.type !== 'text') return { match: null, confidence: LOW };

    const parsed = JSON.parse(content.text) as {
      match: string | null;
      confidence: AIConfidence;
    };
    return {
      match: parsed.match ?? null,
      confidence: parsed.confidence === HIGH ? HIGH : LOW,
    };
  }
}
