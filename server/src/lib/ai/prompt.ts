export const buildMatchIngredientPrompt = (name: string, candidates: string[]): string =>
  `You are a food ingredient matching assistant. Given a user-entered ingredient name and a list of canonical ingredient names, determine if there is a high-confidence match.

User input: "${name}"
Candidates: ${JSON.stringify(candidates)}

Respond with JSON only: { "match": "<matched candidate or null>", "confidence": "high" or "low" }
Only return "high" confidence if you are certain the user input refers to one of the candidates.`;
