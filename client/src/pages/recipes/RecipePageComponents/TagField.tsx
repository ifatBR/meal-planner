import { useState, useRef, useEffect } from "react";
import {
  Box,
  Flex,
  Text,
  TagRoot,
  TagLabel,
  TagCloseTrigger,
  TagStartElement,
} from "@chakra-ui/react";
import { Button } from "@/components/Button";
import { BodyText } from "@/components/Typography";
import {
  COLORS,
  FONT_SIZES,
  RADII,
  SHADOWS,
  SPACING,
  Z_INDEX,
} from "@/styles/designTokens";

export interface TagItem {
  id: string;
  name: string;
  color?: string;
}

interface TagFieldProps {
  allItems: TagItem[];
  selected: TagItem[];
  onChange: (next: TagItem[]) => void;
  error?: string;
  conflictError?: string;
}

export function TagField({
  allItems,
  selected,
  onChange,
  error,
  conflictError,
}: TagFieldProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedIds = new Set(selected.map((s) => s.id));
  const available = allItems.filter((item) => !selectedIds.has(item.id));

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const handleRemove = (id: string) => {
    onChange(selected.filter((s) => s.id !== id));
  };

  const handleAdd = (item: TagItem) => {
    onChange([...selected, item]);
    setOpen(false);
  };

  return (
    <Box>
      <Flex wrap="wrap" gap={SPACING[2]} align="center">
        {selected.map((item) => (
          <TagRoot
            key={item.id}
            size="md"
            bg={COLORS.bg.surface}
            border={`1px solid ${COLORS.border.default}`}
            borderRadius={RADII.full}
            pl={item.color ? SPACING[2] : SPACING[3]}
            pr={SPACING[2]}
            py={SPACING[1]}
            display="flex"
            alignItems="center"
            gap={SPACING[1]}
          >
            {item.color && (
              <TagStartElement
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Box
                  w="8px"
                  h="8px"
                  borderRadius={RADII.full}
                  bg={item.color}
                  flexShrink={0}
                />
              </TagStartElement>
            )}
            <TagLabel
              fontSize={FONT_SIZES.sm}
              color={COLORS.text.primary}
              whiteSpace="nowrap"
            >
              {item.name}
            </TagLabel>
            <TagCloseTrigger
              onClick={() => handleRemove(item.id)}
              color={COLORS.text.secondary}
              cursor="pointer"
              h="10px"
              w="10px"
              display="flex"
              alignItems="center"
              aria-label={`Remove ${item.name}`}
            />
          </TagRoot>
        ))}

        <Box position="relative" ref={dropdownRef} alignSelf="center">
          <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
            + Add
          </Button>
          {open && (
            <Box
              position="absolute"
              top="100%"
              left={0}
              mt={SPACING[1]}
              zIndex={Z_INDEX.dropdown}
              bg={COLORS.bg.surface}
              border={`1px solid ${COLORS.border.default}`}
              borderRadius={RADII.md}
              boxShadow={SHADOWS.md}
              minW="160px"
            >
              {available.length === 0 ? (
                <Box px={SPACING[3]} py={SPACING[2]}>
                  <BodyText secondary>(none available)</BodyText>
                </Box>
              ) : (
                available.map((item) => (
                  <Flex
                    key={item.id}
                    align="center"
                    gap={SPACING[2]}
                    px={SPACING[3]}
                    py={SPACING[2]}
                    cursor="pointer"
                    fontSize={FONT_SIZES.sm}
                    color={COLORS.text.primary}
                    _hover={{ bg: COLORS.highlight.tertiary }}
                    onClick={() => handleAdd(item)}
                  >
                    {item.color && (
                      <Box
                        w="8px"
                        h="8px"
                        borderRadius={RADII.full}
                        bg={item.color}
                        flexShrink={0}
                      />
                    )}
                    {item.name}
                  </Flex>
                ))
              )}
            </Box>
          )}
        </Box>
      </Flex>

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
      {conflictError && (
        <Text
          role="alert"
          fontSize={FONT_SIZES.sm}
          color={COLORS.semantic.error}
          mt={SPACING[1]}
        >
          {conflictError}
        </Text>
      )}
    </Box>
  );
}
