import { fromChainId } from '@shapeshiftoss/caip'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'

import type {
  CosmosTransactionData,
  EvmTransactionData,
  SolanaTransactionData,
  TransactionData,
  UtxoTransactionData,
} from '../../types'
import { getEvmChainIdNumber } from './utils'

const extractEvmTransactionData = (step: TradeQuoteStep): EvmTransactionData | undefined => {
  if (step.transactionData?.type !== 'evm') return undefined

  const chainId = getEvmChainIdNumber(step.sellAsset.chainId)
  const { to, data, value, gasLimit, signatureRequired } = step.transactionData

  return { type: 'evm', chainId, to, data, value, gasLimit, signatureRequired }
}

const extractSolanaTransactionData = (step: TradeQuoteStep): SolanaTransactionData | undefined => {
  if (step.transactionData?.type !== 'solana') return undefined

  const { instructions, addressLookupTableAddresses } = step.transactionData

  return {
    type: 'solana',
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
  if (step.transactionData?.type !== 'utxo') return undefined

  const { to, opReturnData, value } = step.transactionData

  return { type: 'utxo', to, opReturnData, value }
}

const extractCosmosTransactionData = (step: TradeQuoteStep): CosmosTransactionData | undefined => {
  if (step.thorchainTransactionMetadata?.to) {
    return {
      type: 'cosmos',
      chainId: step.sellAsset.chainId,
      to: step.thorchainTransactionMetadata.to,
      value:
        step.thorchainTransactionMetadata.value ??
        step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      memo: step.thorchainTransactionMetadata.memo ?? '',
    }
  }

  return undefined
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
    return extractCosmosTransactionData(step)
  }

  return undefined
}
