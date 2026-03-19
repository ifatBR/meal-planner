import { z } from 'zod';

export const ReorderSlotsSchema = z.object({
  slotIds: z.array(z.string().uuid()),
});
export type ReorderSlotsInput = z.infer<typeof ReorderSlotsSchema>;

export const LayoutParamsSchema = z.object({
  layoutId: z.string().uuid(),
});
export type LayoutParams = z.infer<typeof LayoutParamsSchema>;
