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
  const chainId = getEvmChainIdNumber(step.sellAsset.chainId)

  const txData: EvmTransactionData | undefined = (() => {
    if (step.zrxTransactionMetadata) {
      return {
        type: 'evm' as const,
        chainId,
        to: step.zrxTransactionMetadata.to,
        data: step.zrxTransactionMetadata.data,
        value: step.zrxTransactionMetadata.value,
        gasLimit: step.zrxTransactionMetadata.gas,
      }
    }

    if (step.portalsTransactionMetadata) {
      return {
        type: 'evm' as const,
        chainId,
        to: step.portalsTransactionMetadata.to,
        data: step.portalsTransactionMetadata.data,
        value: step.portalsTransactionMetadata.value,
        gasLimit: step.portalsTransactionMetadata.gasLimit,
      }
    }

    if (step.bebopTransactionMetadata) {
      return {
        type: 'evm' as const,
        chainId,
        to: step.bebopTransactionMetadata.to,
        data: step.bebopTransactionMetadata.data,
        value: step.bebopTransactionMetadata.value,
        gasLimit: step.bebopTransactionMetadata.gas,
      }
    }

    if (step.butterSwapTransactionMetadata) {
      return {
        type: 'evm' as const,
        chainId,
        to: step.butterSwapTransactionMetadata.to,
        data: step.butterSwapTransactionMetadata.data,
        value: step.butterSwapTransactionMetadata.value,
        gasLimit: step.butterSwapTransactionMetadata.gasLimit,
      }
    }

    if (step.relayTransactionMetadata?.to && step.relayTransactionMetadata?.data) {
      return {
        type: 'evm' as const,
        chainId,
        to: step.relayTransactionMetadata.to,
        data: step.relayTransactionMetadata.data,
        value: step.relayTransactionMetadata.value ?? '0',
        gasLimit: step.relayTransactionMetadata.gasLimit,
      }
    }

    if (step.chainflipSpecific?.chainflipDepositAddress) {
      return {
        type: 'evm' as const,
        chainId,
        to: step.chainflipSpecific.chainflipDepositAddress,
        data: '0x',
        value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      }
    }

    if (step.nearIntentsSpecific?.depositAddress) {
      return {
        type: 'evm' as const,
        chainId,
        to: step.nearIntentsSpecific.depositAddress,
        data: '0x',
        value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      }
    }

    if (step.thorchainTransactionMetadata?.data) {
      return {
        type: 'evm' as const,
        chainId,
        to: step.thorchainTransactionMetadata.to,
        data: step.thorchainTransactionMetadata.data,
        value: step.thorchainTransactionMetadata.value ?? '0',
      }
    }

    return undefined
  })()

  if (!txData) return undefined

  if (step.permit2Eip712 && !txData.signatureRequired) {
    return { ...txData, signatureRequired: { type: 'permit2', eip712: step.permit2Eip712 } }
  }

  return txData
}

const extractSolanaTransactionData = (step: TradeQuoteStep): SolanaTransactionData | undefined => {
  if (!step.solanaTransactionMetadata?.instructions) {
    return undefined
  }

  const instructions = step.solanaTransactionMetadata.instructions.map(ix => ({
    programId: ix.programId.toBase58(),
    keys: ix.keys.map(key => ({
      pubkey: key.pubkey.toBase58(),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: Buffer.from(ix.data).toString('base64'),
  }))

  return {
    type: 'solana',
    instructions,
    addressLookupTableAddresses: step.solanaTransactionMetadata.addressLookupTableAddresses,
  }
}

const extractUtxoTransactionData = (step: TradeQuoteStep): UtxoTransactionData | undefined => {
  if (step.relayTransactionMetadata?.to) {
    return {
      type: 'utxo_deposit',
      depositAddress: step.relayTransactionMetadata.to,
      memo: step.relayTransactionMetadata.opReturnData ?? '',
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    }
  }

  if (step.chainflipSpecific?.chainflipDepositAddress) {
    return {
      type: 'utxo_deposit',
      depositAddress: step.chainflipSpecific.chainflipDepositAddress,
      memo: '',
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    }
  }

  if (step.thorchainTransactionMetadata?.to) {
    return {
      type: 'utxo_deposit',
      depositAddress: step.thorchainTransactionMetadata.to,
      memo: step.thorchainTransactionMetadata.memo ?? '',
      value:
        step.thorchainTransactionMetadata.value ??
        step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    }
  }

  return undefined
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
