import { z } from 'zod'

// Strictly validates a numeric string (non-empty, finite) and transforms to number.
// A malformed value fails parsing and surfaces via parseResponse as a thrown error.
export const NumericString = z
  .string()
  .trim()
  .refine(v => v !== '' && Number.isFinite(Number(v)), { message: 'Expected a numeric string' })
  .transform(v => Number(v))

// Soft-fail variant: malformed or missing value becomes null (display as "—") rather
// than failing the whole response. Use for per-row fields where one bad cell should
// not take down the page.
export const NullableNumericString = NumericString.nullable().catch(null)

interface ErrorBody {
  error?: string
  details?: { message: string }[]
}

const throwFromResponse = async (response: Response): Promise<never> => {
  const body = (await response.json().catch(() => ({}))) as ErrorBody
  throw new Error(
    body.details?.[0]?.message ?? body.error ?? `Request failed (${String(response.status)})`,
  )
}

export const parseResponse = async <T extends z.ZodTypeAny>(
  response: Response,
  schema: T,
): Promise<z.infer<T>> => {
  if (!response.ok) await throwFromResponse(response)

  const json = await response.json().catch(() => null)

  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    console.error('Invalid API response shape:', parsed.error.errors)
    throw new Error('Invalid response from server')
  }

  return parsed.data
}

export const postJson = async (
  url: string,
  method: 'POST' | 'PATCH',
  body: unknown,
  authHeaders: Record<string, string> = {},
): Promise<void> => {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(body),
  })

  if (!response.ok) await throwFromResponse(response)
}
