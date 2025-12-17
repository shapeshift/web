import type { Infer } from 'myzod'
import z from 'myzod'

const IconSchema = z.object({
  url: z.string(),
})

const ExternalLinkSchema = z.object({
  type: z.string(),
  name: z.string(),
  url: z.string(),
})

const ImplementationSchema = z.object({
  chain_id: z.string(),
  address: z.string().nullable().optional(),
  decimals: z.number(),
})

export type ZerionImplementation = Infer<typeof ImplementationSchema>

const ChangesSchema = z.object({
  percent_1d: z.number().nullable().optional(),
  percent_30d: z.number().nullable().optional(),
  percent_90d: z.number().nullable().optional(),
  percent_365d: z.number().nullable().optional(),
})

const MarketDataSchema = z.object({
  total_supply: z.number().nullable(),
  circulating_supply: z.number().nullable(),
  market_cap: z.number().nullable(),
  fully_diluted_valuation: z.number().nullable(),
  price: z.number().nullable(),
  changes: ChangesSchema,
})

const AttributesSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  description: z.string().nullable(),
  icon: IconSchema.nullable().optional(),
  flags: z
    .object({
      verified: z.boolean(),
    })
    .optional(),
  external_links: z.array(ExternalLinkSchema).optional(),
  implementations: z.array(ImplementationSchema).optional(),
  market_data: MarketDataSchema,
})

const ChartSchema = z.object({
  links: z.object({
    related: z.string(),
  }),
  data: z.object({
    type: z.string(),
    id: z.string(),
  }),
})

const RelationshipsSchema = z.object({
  chart_day: ChartSchema,
  chart_hour: ChartSchema,
  chart_max: ChartSchema,
  chart_month: ChartSchema,
  chart_week: ChartSchema,
  chart_year: ChartSchema,
  chart_3months: ChartSchema,
})

const LinksSchema = z.object({
  self: z.string(),
})

const DataSchema = z.array(
  z.object({
    type: z.string(),
    id: z.string(),
    attributes: AttributesSchema,
    relationships: RelationshipsSchema,
    links: LinksSchema.optional(),
  }),
)

export const zerionFungiblesSchema = z.object({
  links: LinksSchema,
  data: DataSchema,
})
