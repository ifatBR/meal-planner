import { SPACING } from "@/styles/designTokens";
import { Flex } from "@chakra-ui/react";
import { Button } from "./Button";
import { BodyText } from "./Typography";

interface PaginationProps {
  meta: any;
  setPage: (func: (number: number) => number) => void;
}
export function Pagination({ meta, setPage }: PaginationProps) {
  return (
    meta &&
    meta.totalPages > 1 && (
      <Flex align="center" gap={SPACING[3]} pt={SPACING[4]}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setPage((p: number) => p - 1)}
          disabled={meta.page === 1}
        >
          Previous
        </Button>
        <BodyText secondary>
          Page {meta.page} of {meta.totalPages}
        </BodyText>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setPage((p: number) => p + 1)}
          disabled={meta.page === meta.totalPages}
        >
          Next
        </Button>
      </Flex>
    )
  );
}
