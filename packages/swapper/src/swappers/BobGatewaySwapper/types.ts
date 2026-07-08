import type { TxBuildData } from '../../types'

export type BobGatewayOrder = {
  orderId: string
  transactionData: TxBuildData
}

export type BobGatewayMetadata = {
  name: 'bob'
  orderId: string
}
