import type { KnownChainIds } from '@shapeshiftoss/types'

export type AvnuSupportedChainId = typeof KnownChainIds.StarknetMainnet

export type AvnuMetadata = {
  name: 'avnu'
  quoteId: string
}
