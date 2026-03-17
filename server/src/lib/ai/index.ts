import { AI_PROVIDER } from '../../constants';
import { AIClient } from './types';
import { OpenAIClient } from './openai';
import { AnthropicClient } from './anthropic';

export const aiClient: AIClient =
  AI_PROVIDER === 'openai' ? new OpenAIClient() : new AnthropicClient();
