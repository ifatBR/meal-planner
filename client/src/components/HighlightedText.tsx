// ── Highlight helper ────────────────────────────────────────────────────────

import { COLORS } from "@/styles/designTokens";
import { Box } from "@chakra-ui/react";

export function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <Box as="span" bg={COLORS.highlight.default}>
        {text.slice(idx, idx + query.length)}
      </Box>
      {text.slice(idx + query.length)}
    </>
  );
}
