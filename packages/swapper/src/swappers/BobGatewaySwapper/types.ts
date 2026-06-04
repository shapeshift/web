import type { GatewayQuoteV2 } from '@gobob/bob-sdk'

type BobGatewayEvmTxMetadata = {
  to: string
  data: string
  value: string
  chain: string
}

type BobGatewayMetadataBase = {
  orderId?: string
  depositAddress?: string
  opReturnData?: string | null
  evmTx?: BobGatewayEvmTxMetadata
}

export type BobGatewayTradeQuoteMetadata = BobGatewayMetadataBase & {
  gatewayQuote: GatewayQuoteV2
}

export type BobGatewaySwapMetadata = BobGatewayMetadataBase & {
  gatewayQuote?: GatewayQuoteV2
}
