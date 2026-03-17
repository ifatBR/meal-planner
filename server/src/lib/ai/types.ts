export type AIProvider = 'anthropic' | 'openai';

export const AI_CONFIDENCE = {
  HIGH: 'high',
  LOW: 'low',
} as const;

export type AIConfidence = (typeof AI_CONFIDENCE)[keyof typeof AI_CONFIDENCE];

export interface AIClient {
  matchIngredient(
    name: string,
    candidates: string[],
  ): Promise<{ match: string | null; confidence: AIConfidence }>;
}
