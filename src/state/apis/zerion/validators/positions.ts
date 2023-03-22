import * as z from 'zod'

export const zerionPositionsSchema = z.object({
  links: z.object({
    self: z.string(),
  }),
  data: z.array(
    z.object({
      type: z.string(),
      id: z.string(),
      attributes: z.object({
        parent: z.nullable(z.any()),
        protocol: z.nullable(z.any()),
        name: z.string(),
        position_type: z.string(),
        quantity: z.object({
          int: z.string(),
          decimals: z.number(),
          float: z.number(),
          numeric: z.string(),
        }),
        value: z.number(),
        price: z.number(),
        changes: z.object({
          absolute_1d: z.number(),
          percent_1d: z.number(),
        }),
        fungible_info: z.object({
          name: z.string(),
          symbol: z.string(),
          icon: z.object({
            url: z.string(),
          }),
          flags: z.object({
            verified: z.boolean(),
          }),
          implementations: z.array(
            z.object({
              chain_id: z.string(),
              address: z.nullable(z.string()),
              decimals: z.number(),
            }),
          ),
        }),
        flags: z.object({
          displayable: z.boolean(),
        }),
        updated_at: z.string(),
        updated_at_block: z.number(),
      }),
      relationships: z.object({
        chain: z.object({
          links: z.object({
            related: z.string(),
          }),
          data: z.object({
            type: z.string(),
            id: z.string(),
          }),
        }),
        fungible: z.object({
          links: z.object({
            related: z.string(),
          }),
          data: z.object({
            type: z.string(),
            id: z.string(),
          }),
        }),
      }),
    }),
  ),
})
