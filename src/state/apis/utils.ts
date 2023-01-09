export const handleApiError = (
  e: unknown,
  defaultErrorMessage: string,
): { error: Record<string, unknown> } => {
  if (e instanceof Error) return { error: { ...e } }
  else
    return {
      error: {
        error: defaultErrorMessage,
        status: 'CUSTOM_ERROR',
      },
    }
}
