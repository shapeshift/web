import { z } from 'zod'

import { registry } from '../../registry'

export const SiweVerifyRequestSchema = z.object({
  message: z.string(),
  signature: z.string(),
})

export const SiweNonceResponseSchema = registry.register(
  'SiweNonceResponse',
  z.object({
    nonce: z.string().openapi({ example: 'abcdef123456' }),
  }),
)

export const SiweVerifyResponseSchema = registry.register(
  'SiweVerifyResponse',
  z.object({
    token: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
    address: z.string().openapi({ example: '0x1234567890123456789012345678901234567890' }),
  }),
)

export type SiweVerifyRequest = z.infer<typeof SiweVerifyRequestSchema>
export type SiweNonceResponse = z.infer<typeof SiweNonceResponseSchema>
export type SiweVerifyResponse = z.infer<typeof SiweVerifyResponseSchema>
