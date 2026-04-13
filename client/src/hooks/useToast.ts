import { toaster } from '@/components/ui/toaster';

export function useToast() {
  return {
    success: (message: string) => toaster.create({ title: message, type: 'success' }),
    error: (message: string) => toaster.create({ title: message, type: 'error' }),
    info: (message: string) => toaster.create({ title: message, type: 'info' }),
    warning: (message: string) => toaster.create({ title: message, type: 'warning' }),
  };
}
