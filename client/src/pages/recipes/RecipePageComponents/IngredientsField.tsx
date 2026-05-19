import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Flex, Spinner, Text } from "@chakra-ui/react";
import { Star } from "lucide-react";
import { fetchIngredients } from "@/api/ingredients";
import { Button } from "@/components/Button";
import { SearchInput } from "@/components/SearchInput";
import { ClickableListItem } from "@/components/ClickableListItem";
import { BodyText } from "@/components/Typography";
import { HighlightedText } from "@/components/HighlightedText";
import { Tooltip } from "@/components/ui/tooltip";
import {
  COLORS,
  FONT_SIZES,
  ICON_SIZES,
  MIN_HEIGHTS,
  RADII,
  SPACING,
} from "@/styles/designTokens";
import { capitalizeFirst } from "@/utils/text";

export interface FormIngredient {
  id: string;
  displayName: string;
  isMain: boolean;
  measure?: { amount: number; unit: string };
}

interface IngredientsFieldProps {
  value: FormIngredient[];
  onChange: (next: FormIngredient[]) => void;
  error?: string;
}

export function IngredientsField({
  value,
  onChange,
  error,
}: IngredientsFieldProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const searchPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!showSearch) return;
    const handle = (e: MouseEvent) => {
      if (
        searchPanelRef.current &&
        !searchPanelRef.current.contains(e.target as Node)
      ) {
        handleCancelSearch();
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSearch]);

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["ingredients-search", search],
    queryFn: () => fetchIngredients(1, search || undefined),
    enabled: showSearch,
  });

  const addedIds = new Set(value.map((v) => v.id));
  const availableResults = (searchResults?.items ?? []).filter(
    (ing) => !addedIds.has(ing.id),
  );

  const handleSetMain = (id: string) => {
    onChange(value.map((v) => ({ ...v, isMain: v.id === id })));
  };

  const handleRemove = (id: string) => {
    const next = value.filter((v) => v.id !== id);
    // If we removed the main, promote the first remaining
    const hasMain = next.some((v) => v.isMain);
    if (!hasMain && next.length > 0) {
      next[0] = { ...next[0], isMain: true };
    }
    onChange(next);
  };

  const handleAddIngredient = (ing: { id: string; name: string }) => {
    const isFirst = value.length === 0;
    onChange([
      ...value,
      {
        id: ing.id,
        displayName: ing.name,
        isMain: isFirst,
        measure: undefined,
      },
    ]);
    setShowSearch(false);
    setSearchInput("");
    setSearch("");
  };

  const handleCancelSearch = () => {
    setShowSearch(false);
    setSearchInput("");
    setSearch("");
  };

  return (
    <Box>
      {/* Ingredient rows */}
      {value.map((ing) => (
        <IngredientRow
          key={ing.id}
          ingredient={ing}
          onSetMain={() => handleSetMain(ing.id)}
          onRemove={() => handleRemove(ing.id)}
        />
      ))}

      {/* Add ingredient */}
      {!showSearch ? (
        <Box pt={value.length > 0 ? SPACING[2] : undefined}>
          <Button variant="ghost" size="sm" onClick={() => setShowSearch(true)}>
            + Add ingredient
          </Button>
        </Box>
      ) : (
        <Box
          ref={searchPanelRef}
          mt={SPACING[2]}
          p={SPACING[3]}
          border={`1px solid ${COLORS.border.default}`}
          borderRadius={RADII.md}
        >
          <SearchInput
            placeholder="Search ingredients…"
            value={searchInput}
            onChange={setSearchInput}
          />

          <Box mt={SPACING[2]}>
            {searchLoading && (
              <Flex justify="center" py={SPACING[2]}>
                <Spinner size="sm" />
              </Flex>
            )}
            {!searchLoading && search && availableResults.length === 0 && (
              <Box py={SPACING[2]}>
                <BodyText secondary>No ingredients match "{search}".</BodyText>
              </Box>
            )}
            {!searchLoading &&
              availableResults.map((ing) => (
                <ClickableListItem
                  key={ing.id}
                  name={ing.name}
                  nameDisplay={
                    <HighlightedText text={ing.name} query={searchInput} />
                  }
                  onClick={() => handleAddIngredient(ing)}
                />
              ))}
          </Box>

          <Box mt={SPACING[2]}>
            <Button variant="ghost" size="sm" onClick={handleCancelSearch}>
              Cancel
            </Button>
          </Box>
        </Box>
      )}

      {error && (
        <Text
          role="alert"
          fontSize={FONT_SIZES.sm}
          color={COLORS.semantic.error}
          mt={SPACING[1]}
        >
          {error}
        </Text>
      )}
    </Box>
  );
}

interface IngredientRowProps {
  ingredient: FormIngredient;
  onSetMain: () => void;
  onRemove: () => void;
}

function IngredientRow({
  ingredient,
  onSetMain,
  onRemove,
}: IngredientRowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Flex
      align="center"
      gap={SPACING[2]}
      py={SPACING[2]}
      ps={SPACING[2]}
      pe={SPACING[1]}
      borderRadius={RADII.sm}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      _hover={{ bg: COLORS.highlight.tertiary }}
      transition="background-color 0.15s ease"
    >
      {/* Main marker — only shown for main ingredient */}
      {ingredient.isMain ? (
        <Tooltip content="Main ingredient" positioning={{ placement: "top" }}>
          <Box
            color={COLORS.primary.default}
            cursor="default"
            display="flex"
            alignItems="center"
            flexShrink={0}
            aria-label="Main ingredient"
          >
            <Star size={ICON_SIZES.xs} fill="currentColor" />
          </Box>
        </Tooltip>
      ) : (
        <Box
          w="5px"
          h="5px"
          borderRadius={RADII.full}
          bg={COLORS.primary.default}
          flexShrink={0}
          m={SPACING[1]}
        />
      )}

      <Box flex={1}>
        <BodyText>{capitalizeFirst(ingredient.displayName)}</BodyText>
      </Box>

      {/* "Set as main" — always in DOM; hidden+inert for main to preserve row height */}
      <Box
        visibility={ingredient.isMain ? "hidden" : "visible"}
        pointerEvents={ingredient.isMain ? "none" : "auto"}
        opacity={!ingredient.isMain && hovered ? 1 : 0}
        transition="opacity 0.15s ease"
        flexShrink={0}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onSetMain}
          aria-label={`Set ${ingredient.displayName} as main`}
          tabIndex={!ingredient.isMain && hovered ? 0 : -1}
        >
          Set as main
        </Button>
      </Box>

      {/* Remove — always in DOM; hidden+inert for main to preserve row height */}
      <Box
        visibility={ingredient.isMain ? "hidden" : "visible"}
        pointerEvents={ingredient.isMain ? "none" : "auto"}
        opacity={!ingredient.isMain && hovered ? 1 : 0}
        transition="opacity 0.15s ease"
        flexShrink={0}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label={`Remove ${ingredient.displayName}`}
          tabIndex={!ingredient.isMain && hovered ? 0 : -1}
        >
          ×
        </Button>
      </Box>
    </Flex>
  );
}
