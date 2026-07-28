import { fromChainId } from '@shapeshiftoss/caip'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'

import type {
  CosmosSdkMsgDepositTransactionData,
  CosmosSdkMsgSendTransactionData,
  EvmTransactionData,
  SolanaSerializedTxTransactionData,
  SolanaTransactionData,
  TransactionData,
  UtxoTransactionData,
} from '../../types'
import { getEvmChainIdNumber } from './utils'

const extractEvmTransactionData = (step: TradeQuoteStep): EvmTransactionData | undefined => {
  if (step.transactionData?.type !== 'evm') return

  const chainId = getEvmChainIdNumber(step.sellAsset.chainId)
  const { to, data, value, gasLimit, signatureRequired } = step.transactionData

  return { type: 'evm', chainId, to, data, value, gasLimit, signatureRequired }
}

const extractSolanaTransactionData = (
  step: TradeQuoteStep,
): SolanaTransactionData | SolanaSerializedTxTransactionData | undefined => {
  if (step.transactionData?.type === 'solana_serialized_tx') {
    const { serializedTx } = step.transactionData
    return { type: 'solana_serialized_tx', serializedTx }
  }

  if (step.transactionData?.type !== 'solana_instructions') return

  const { instructions, addressLookupTableAddresses } = step.transactionData

  return {
    type: 'solana_instructions',
    instructions: instructions.map(instruction => ({
      programId: instruction.programId.toBase58(),
      keys: instruction.keys.map(key => ({
        pubkey: key.pubkey.toBase58(),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      data: Buffer.from(instruction.data).toString('base64'),
    })),
    addressLookupTableAddresses,
  }
}

const extractUtxoTransactionData = (step: TradeQuoteStep): UtxoTransactionData | undefined => {
  if (step.transactionData?.type !== 'utxo') return

  const { to, opReturnData, value } = step.transactionData

  return { type: 'utxo', to, opReturnData, value }
}

const extractCosmosSdkTransactionData = (
  step: TradeQuoteStep,
): CosmosSdkMsgSendTransactionData | CosmosSdkMsgDepositTransactionData | undefined => {
  if (step.transactionData?.type === 'cosmossdk_msg_send') {
    const { chainId, to, denom, value, memo } = step.transactionData
    return { type: 'cosmossdk_msg_send', chainId, to, denom, value, memo }
  }

  if (step.transactionData?.type === 'cosmossdk_msg_deposit') {
    const { chainId, value, memo, coin } = step.transactionData
    return { type: 'cosmossdk_msg_deposit', chainId, value, memo, coin }
  }
}

export const extractTransactionData = (step: TradeQuoteStep): TransactionData | undefined => {
  const { chainNamespace } = fromChainId(step.sellAsset.chainId)

  if (chainNamespace === 'eip155') {
    return extractEvmTransactionData(step)
  }

  if (chainNamespace === 'solana') {
    return extractSolanaTransactionData(step)
  }

  if (chainNamespace === 'bip122') {
    return extractUtxoTransactionData(step)
  }

  if (chainNamespace === 'cosmos') {
    return extractCosmosSdkTransactionData(step)
  }
}
