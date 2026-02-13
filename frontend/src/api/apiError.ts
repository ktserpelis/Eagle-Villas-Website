import axios from "axios";

/**
 * Expected error payload shape from backend.
 *
 * Your backend may return:
 *
 * 1) General error:
 *    { message: string }
 *
 * 2) Validation error:
 *    {
 *      message: string,
 *      errors: {
 *        email?: string[],
 *        password?: string[],
 *        ...
 *      }
 *    }
 */
export type ApiErrorPayload = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

/**
 * Safely extracts a user-friendly error message from an unknown error.
 *
 * Priority:
 * 1) Backend-provided message (best UX)
 * 2) Axios/network error message
 * 3) Fallback string
 *
 * Prevents:
 * - "[object Object]"
 * - Raw Axios error dumps
 * - Undefined error text
 */
export function getApiErrorMessage(
  err: unknown,
  fallback = "Something went wrong."
): string {
  if (axios.isAxiosError<ApiErrorPayload>(err)) {
    const backendMsg = err.response?.data?.message;
    if (backendMsg) return backendMsg;

    if (err.message) return err.message;
  }

  if (err instanceof Error && err.message) {
    return err.message;
  }

  return fallback;
}

/**
 * Extracts backend field-level validation errors if present.
 *
 * Returns:
 * - Record<string, string[]> if backend sent validation errors
 * - null if none exist
 *
 * Example backend payload:
 * {
 *   message: "Invalid registration data",
 *   errors: {
 *     email: ["Email already in use"]
 *   }
 * }
 */
export function getApiFieldErrors(
  err: unknown
): Record<string, string[] | undefined> | null {
  if (axios.isAxiosError<ApiErrorPayload>(err)) {
    return err.response?.data?.errors ?? null;
  }

  return null;
}
