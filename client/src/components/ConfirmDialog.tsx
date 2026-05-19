import {
  DialogBackdrop,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  Flex,
  Portal,
} from "@chakra-ui/react";
import { Button } from "@/components/Button";
import { BodyText } from "@/components/Typography";
import { COLORS, SPACING } from "@/styles/designTokens";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <DialogRoot
      open={open}
      onOpenChange={(details) => {
        if (!details.open) onClose();
      }}
    >
      <DialogBackdrop />
      <Portal>
        <DialogPositioner>
          <DialogContent bg={COLORS.bg.base}>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            {description && (
              <DialogBody>
                <BodyText>{description}</BodyText>
              </DialogBody>
            )}
            <DialogFooter>
              <Flex gap={SPACING[3]} justify="flex-end">
                <Button
                  variant="secondary"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={onConfirm}
                  isLoading={isLoading}
                >
                  Delete
                </Button>
              </Flex>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </Portal>
    </DialogRoot>
  );
}
