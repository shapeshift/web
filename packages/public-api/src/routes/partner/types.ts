import { z } from 'zod'

import { registry } from '../../registry'
import { EVM_ADDRESS } from '../../types'

export const PartnerCodeParamsSchema = z.object({
  code: z.string().trim().min(1),
})

export const PartnerResolutionResponseSchema = registry.register(
  'PartnerResolution',
  z.object({
    partnerAddress: EVM_ADDRESS,
    partnerBps: z.number().int().min(0).openapi({ example: 50 }),
    partnerCode: z.string().openapi({ example: 'mypartner' }),
    shapeshiftBps: z.number().int().min(0).openapi({ example: 10 }),
  }),
)

export type PartnerCodeParams = z.infer<typeof PartnerCodeParamsSchema>
export type PartnerResolution = z.infer<typeof PartnerResolutionResponseSchema>
