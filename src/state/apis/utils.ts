import { ErrorWithDetails } from '@shapeshiftoss/errors'
import isEmpty from 'lodash/isEmpty'

type HandleApiErrorArgs = {
  message: string
  error?: unknown
}

const handleApiError = ({
  error,
  message,
}: HandleApiErrorArgs): { error: Record<string, unknown> } => {
  // 'code' is a getter on the ErrorWithDetails class, so we need to explicitly add it to our object
  if (error instanceof ErrorWithDetails) return { error: { ...error, code: error.code } }
  if (error instanceof Error && !isEmpty(error)) return { error: { ...error } }
  else
    return {
      error: {
        error: message,
        status: 'CUSTOM_ERROR',
      },
    }
}

// Returns a curried handleApiError function with a default value for the message argument that can be overridden once instantiated
export const apiErrorHandler =
  (defaultMessage: HandleApiErrorArgs['message']) =>
  (error?: HandleApiErrorArgs['error'], message?: HandleApiErrorArgs['message']) =>
    handleApiError({ message: message ?? defaultMessage, error })
