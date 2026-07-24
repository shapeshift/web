import type {
  GetEvmTradeQuoteInputBase,
  GetEvmTradeRateInput,
  GetUtxoTradeQuoteInput,
  GetUtxoTradeRateInput,
} from '../../types'

export type BobGatewayMetadata = {
  name: 'bob'
  orderId: string
}

// Bob Gateway bridges BTC (utxo) and EVM chains; Tron is currently disabled (see chain name map)
export type BobGatewayTradeQuoteInput = GetEvmTradeQuoteInputBase | GetUtxoTradeQuoteInput
export type BobGatewayTradeRateInput = GetEvmTradeRateInput | GetUtxoTradeRateInput
