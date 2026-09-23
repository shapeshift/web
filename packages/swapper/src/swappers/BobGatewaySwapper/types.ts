import type {
  GetEvmTradeQuoteInput,
  GetEvmTradeRateInput,
  GetTronTradeQuoteInput,
  GetTronTradeRateInput,
  GetUtxoTradeQuoteInput,
  GetUtxoTradeRateInput,
} from '../../types'

export type BobGatewayMetadata = {
  name: 'bob'
  orderId: string
}

export type BobGatewayTradeQuoteInput =
  | GetEvmTradeQuoteInput
  | GetUtxoTradeQuoteInput
  | GetTronTradeQuoteInput

export type BobGatewayTradeRateInput =
  | GetEvmTradeRateInput
  | GetUtxoTradeRateInput
  | GetTronTradeRateInput
