type BobGatewayEvmTxMetadata = {
  to: string
  data: string
  value: string
  chain: string
}

type BobGatewayUtxoTxMetadata = {
  depositAddress: string
  opReturnData?: string
  sender: string
}

export type BobGatewayMetadata = { orderId: string } & (
  | { evmTx: BobGatewayEvmTxMetadata; utxoTx?: never }
  | { utxoTx: BobGatewayUtxoTxMetadata; evmTx?: never }
)
