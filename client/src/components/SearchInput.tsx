import { X, Search } from "lucide-react";
import { Box, Flex } from "@chakra-ui/react";
import { Input } from "@/components/Input";
import { COLORS, ICON_SIZES, RADII, SPACING } from "@/styles/designTokens";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: SearchInputProps) {
  return (
    <Box position="relative">
      <Box
        position="absolute"
        left={SPACING[3]}
        top="50%"
        transform="translateY(-50%)"
        color={COLORS.text.tertiary}
        pointerEvents="none"
        zIndex={1}
      >
        <Search size={ICON_SIZES.sm} />
      </Box>

      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          paddingLeft: "36px",
          paddingRight: "36px",
        }}
      />

      <Flex
        position="absolute"
        right={SPACING[2]}
        top="50%"
        transform="translateY(-50%)"
        align="center"
        justify="center"
        w="20px"
        h="20px"
        borderRadius={RADII.full}
        cursor="pointer"
        color={COLORS.text.tertiary}
        opacity={value ? 1 : 0}
        transition="opacity 0.15s ease"
        onClick={() => value && onChange("")}
        _hover={{ color: COLORS.text.primary }}
        aria-label="Clear search"
      >
        <X size={ICON_SIZES.sm} />
      </Flex>
    </Box>
  );
}
