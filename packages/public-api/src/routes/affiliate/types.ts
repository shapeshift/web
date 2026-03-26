import { z } from 'zod'

import { registry } from '../../registry'

export const AffiliateStatsRequestSchema = z
  .object({
    address: z
      .string()
      .regex(
        /^0x[0-9a-fA-F]{40}$/,
        'address must be a valid EVM address (0x followed by 40 hex characters)',
      ),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  .refine(
    ({ startDate, endDate }) =>
      !startDate || !endDate || new Date(startDate).getTime() <= new Date(endDate).getTime(),
    {
      message: 'startDate must be before or equal to endDate',
      path: ['startDate'],
    },
  )

export const AffiliateStatsResponseSchema = registry.register(
  'AffiliateStatsResponse',
  z.object({
    address: z.string().openapi({ example: '0x1234567890123456789012345678901234567890' }),
    totalSwaps: z.number().openapi({ example: 42 }),
    totalVolumeUsd: z.string().openapi({ example: '12345.67' }),
    totalFeesEarnedUsd: z.string().openapi({ example: '44.44' }),
    timestamp: z.number().openapi({ example: 1708700000000 }),
  }),
)

export type AffiliateStatsRequest = z.infer<typeof AffiliateStatsRequestSchema>
export type AffiliateStatsResponse = z.infer<typeof AffiliateStatsResponseSchema>
