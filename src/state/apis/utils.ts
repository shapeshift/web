import { ErrorWithDetails } from '@shapeshiftoss/errors'

export const handleApiError = (
  e: unknown,
  defaultErrorMessage: string,
): { error: Record<string, unknown> } => {
  // 'code' is a getter of ErrorWithDetails, so we need to access it specifically
  if (e instanceof ErrorWithDetails) return { error: { ...e, code: e.code } }
  if (e instanceof Error) return { error: { ...e } }
  else
    return {
      error: {
        error: defaultErrorMessage,
        status: 'CUSTOM_ERROR',
      },
    }
}
