import type { TxBuildData } from '../../types'

export type BobGatewayOrder = {
  orderId: string
  transactionData: TxBuildData
}

export type BobGatewayMetadata = {
  swapper: 'bob'
  orderId: string
}
