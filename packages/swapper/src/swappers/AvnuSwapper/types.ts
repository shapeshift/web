import type { KnownChainIds } from '@shapeshiftoss/types'

import type { GetStarknetTradeQuoteInput, GetStarknetTradeRateInput } from '../../types'

export type AvnuTradeQuoteInput = GetStarknetTradeQuoteInput
export type AvnuTradeRateInput = GetStarknetTradeRateInput

export type AvnuSupportedChainId = typeof KnownChainIds.StarknetMainnet

export type AvnuMetadata = {
  name: 'avnu'
  quoteId: string
}
