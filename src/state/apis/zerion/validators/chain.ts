import * as z from 'zod'

const chainIconSchema = z.object({
  url: z.string().url(),
})

const explorerSchema = z.object({
  name: z.string(),
  token_url_format: z.string().url(),
  tx_url_format: z.string().url(),
  home_url: z.string().url(),
})

const rpcSchema = z.object({
  public_servers_url: z.array(z.string().url()),
})

const flagsSchema = z.object({
  supports_trading: z.boolean(),
  supports_sending: z.boolean(),
  supports_bridge: z.boolean(),
})

const nativeFungibleSchema = z.object({
  links: z.object({
    related: z.string().url(),
  }),
  data: z.object({
    type: z.string(),
    id: z.string(),
  }),
})

const wrappedNativeFungibleSchema = z.object({
  links: z.object({
    related: z.string().url(),
  }),
  data: z.object({
    type: z.string(),
    id: z.string(),
  }),
})

const chainSchema = z.object({
  type: z.string(),
  id: z.string(),
  attributes: z.object({
    external_id: z.string(),
    name: z.string(),
    icon: chainIconSchema,
    explorer: explorerSchema,
    rpc: rpcSchema,
    flags: flagsSchema,
  }),
  relationships: z.object({
    native_fungible: nativeFungibleSchema,
    wrapped_native_fungible: wrappedNativeFungibleSchema,
  }),
  links: z.object({
    self: z.string().url(),
  }),
})

const dataSchema = z.array(chainSchema)

export const zerionChainsSchema = z.object({
  links: z.object({
    self: z.string().url(),
  }),
  data: dataSchema,
})
