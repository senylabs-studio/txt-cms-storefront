// Duck-types the error shape (`{ response: { data: {...} } }`) instead of requiring
// axios.isAxiosError() to pass — a real AxiosError always has this shape, but so do the
// plain-object rejections this codebase's existing tests commonly mock with, and there's
// nothing about extracting `response.data` that actually needs the real Axios class.
const getResponseData = (err: unknown): Record<string, unknown> | undefined => {
  if (typeof err !== 'object' || err === null) return undefined;
  const response = (err as { response?: unknown }).response;
  if (typeof response !== 'object' || response === null) return undefined;
  const data = (response as { data?: unknown }).data;
  return typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : undefined;
};

/**
 * Extracts a specific, user-facing message from an API error response.
 * Handles both the backend's manual `{ status, message }` shape (business-rule
 * exceptions, no field association) and ASP.NET Core's automatic
 * ValidationProblemDetails shape (`{ errors: { Field: string[] } }`, confirmed
 * live against the real backend) from [Required]/[StringLength] etc.
 */
export const getApiErrorMessage = (err: unknown, fallback: string): string => {
  const data = getResponseData(err);
  if (data) {
    if (data.errors && typeof data.errors === 'object') {
      const messages = Object.values(data.errors as Record<string, string[]>).flat();
      if (messages.length > 0) return messages.join(' ');
    }

    if (typeof data.message === 'string' && data.message) return data.message;
    if (typeof data.title === 'string' && data.title) return data.title;
  }

  return fallback;
};

export type FieldErrors = Record<string, string>;

const toCamelCase = (field: string): string =>
  field.length > 0 ? field.charAt(0).toLowerCase() + field.slice(1) : field;

/**
 * Extracts per-field messages from ASP.NET's ValidationProblemDetails shape
 * (`{ errors: { Code: ["The Code field is required."] } }` — keys are the C# DTO
 * property names, i.e. PascalCase), keyed by the camelCase field name a form would
 * use. Returns null for anything else — business-rule failures (e.g. "duplicate
 * email") are thrown as plain exceptions with no field association
 * (`{ status, message }`) and can't be mapped to a specific input, so callers
 * should fall back to getApiErrorMessage for those.
 */
export const parseFieldErrors = (err: unknown): FieldErrors | null => {
  const data = getResponseData(err);
  if (!data?.errors || typeof data.errors !== 'object' || Array.isArray(data.errors)) return null;

  const result: FieldErrors = {};
  for (const [field, messages] of Object.entries(data.errors as Record<string, unknown>)) {
    if (Array.isArray(messages) && messages.length > 0) {
      result[toCamelCase(field)] = messages.join(' ');
    }
  }
  return Object.keys(result).length > 0 ? result : null;
};
