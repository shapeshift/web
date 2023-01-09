import { ErrorWithDetails } from '@shapeshiftoss/errors'

type HandleApiErrorArgs = {
  message: string
  error?: unknown
}

const handleApiError = ({
  error,
  message,
}: HandleApiErrorArgs): { error: Record<string, unknown> } => {
  // 'code' is a getter of ErrorWithDetails, so we need to access it specifically
  if (error instanceof ErrorWithDetails) return { error: { ...error, code: error.code } }
  if (error instanceof Error) return { error: { ...error } }
  else
    return {
      error: {
        error: message,
        status: 'CUSTOM_ERROR',
      },
    }
}

export const apiErrorHandler =
  (defaultMessage: HandleApiErrorArgs['message']) =>
  (error?: HandleApiErrorArgs['error'], message?: HandleApiErrorArgs['message']) =>
    handleApiError({ message: message ?? defaultMessage, error })
