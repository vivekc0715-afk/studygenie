import { toast } from 'sonner';
import { ApiError } from './api';

/** Shows a success toast. */
export function notifySuccess(message, description) {
  toast.success(message, description ? { description } : undefined);
}

export function notifyError(message, description) {
  toast.error(message, description ? { description } : undefined);
}

export function notifyInfo(message, description) {
  toast(message, description ? { description } : undefined);
}

/**
 * Converts any thrown value into a readable toast. Returns the normalised
 * error so callers can branch (e.g. map server field errors).
 */
export function toastError(error, fallback = 'Something went wrong.') {
  const apiError = error instanceof ApiError ? error : null;
  const message = apiError?.message || error?.message || fallback;

  if (apiError?.notConfigured) {
    toast.warning(message, {
      description: apiError.envKey
        ? `Add ${apiError.envKey} to server/.env to enable this feature.`
        : 'This feature needs additional configuration.',
    });
  } else {
    toast.error(message);
  }
  return error;
}

/** Standard onSuccess for mutations that only need a confirmation toast. */
export function mutationToast(message) {
  return () => notifySuccess(message);
}

export { toast };
