import { Flex } from "@chakra-ui/react";
import { BodyText } from "./Typography";
import { Button } from "./Button";
import { SPACING } from "@/styles/designTokens";

interface LoadingErrorProps {
  message: string;
  onClick: () => void;
}
export function LoadingError({ message, onClick }: LoadingErrorProps) {
  return (
    <Flex
      direction="column"
      align="flex-start"
      gap={SPACING[3]}
      pt={SPACING[6]}
    >
      <BodyText secondary>{message}</BodyText>
      <Button variant="secondary" size="sm" onClick={onClick}>
        Retry
      </Button>
    </Flex>
  );
}
