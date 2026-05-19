import type { ReactNode } from "react";
import { Heading, Text } from "@chakra-ui/react";
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from "@/styles/designTokens";

interface ChildrenProps {
  children: ReactNode;
}

export function PageTitle({ children }: ChildrenProps) {
  return (
    <Heading
      as="h1"
      margin={0}
      fontSize={FONT_SIZES["2xl"]}
      fontWeight={FONT_WEIGHTS.semibold}
      color={COLORS.text.primary}
    >
      {children}
    </Heading>
  );
}

export function SectionTitle({ children }: ChildrenProps) {
  return (
    <Heading
      as="h2"
      margin={0}
      fontSize={FONT_SIZES.lg}
      fontWeight={FONT_WEIGHTS.semibold}
      color={COLORS.text.primary}
    >
      {children}
    </Heading>
  );
}

interface BodyTextProps extends ChildrenProps {
  secondary?: boolean;
}

export function BodyText({ children, secondary = false }: BodyTextProps) {
  return (
    <Text
      margin={0}
      fontSize={FONT_SIZES.base}
      fontWeight={FONT_WEIGHTS.regular}
      color={secondary ? COLORS.text.secondary : COLORS.text.primary}
    >
      {children}
    </Text>
  );
}

export function Caption({ children }: ChildrenProps) {
  return (
    <Text
      as="span"
      fontSize={FONT_SIZES.sm}
      fontWeight={FONT_WEIGHTS.regular}
      color={COLORS.text.tertiary}
    >
      {children}
    </Text>
  );
}
