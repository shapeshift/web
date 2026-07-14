type BobGatewayEvmTxMetadata = {
  to: string
  data: string
  value: string
  chain: string
}

type BobGatewayUtxoTxMetadata = {
  depositAddress: string
  opReturnData?: string
}

type BobGatewayTronTxMetadata = {
  to: string
  data: string
  value: string
  feeLimit: string
  chain: string
}

export type BobGatewayMetadata = { orderId: string } & (
  | { evmTx: BobGatewayEvmTxMetadata; utxoTx?: never; tronTx?: never }
  | { utxoTx: BobGatewayUtxoTxMetadata; evmTx?: never; tronTx?: never }
  | { tronTx: BobGatewayTronTxMetadata; evmTx?: never; utxoTx?: never }
)
