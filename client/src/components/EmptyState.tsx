import { Flex } from "@chakra-ui/react";
import { BodyText } from "@/components/Typography";
import { Button } from "@/components/Button";
import { SPACING } from "@/styles/designTokens";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Flex direction="column" align="flex-start" gap={SPACING[4]} pt={SPACING[6]}>
      <BodyText>{title}</BodyText>
      <BodyText secondary>{description}</BodyText>
      {action && (
        <Button variant="primary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Flex>
  );
}
