import { aiClient } from '../../../lib/ai';
import { AI_CONFIDENCE } from '../../../lib/ai/types';

type Candidate = { id: string; name: string; aliases: string[] };

export const findMatchingIngredient = async (
  name: string,
  candidates: Candidate[],
): Promise<{ ingredientId: string; matchedName: string } | null> => {
  if (candidates.length === 0) return null;

  const normalized = name.toLowerCase().trim();

  for (const c of candidates) {
    if (c.name.toLowerCase() === normalized) {
      return { ingredientId: c.id, matchedName: c.name };
    }
    for (const alias of c.aliases) {
      if (alias.toLowerCase() === normalized) {
        return { ingredientId: c.id, matchedName: c.name };
      }
    }
  }

  const allNames = candidates.map((c) => c.name);
  const result = await aiClient.matchIngredient(name, allNames);

  if (result.confidence !== AI_CONFIDENCE.HIGH || !result.match) return null;

  const matched = candidates.find((c) => c.name.toLowerCase() === result.match!.toLowerCase());
  if (!matched) return null;

  return { ingredientId: matched.id, matchedName: matched.name };
};
