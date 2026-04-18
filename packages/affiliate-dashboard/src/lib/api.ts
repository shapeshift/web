import type { z } from 'zod'

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

export const parseResponse = async <T>(response: Response, schema: z.ZodSchema<T>): Promise<T> => {
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
