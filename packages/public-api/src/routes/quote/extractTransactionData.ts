import { fromChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'

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
    if (step.transactionData?.type === 'evm') {
      const { to, data, value, gasLimit } = step.transactionData
      return { type: 'evm' as const, chainId, to, data, value, gasLimit }
    }

    if (step.chainflipSpecific?.depositAddress) {
      return {
        type: 'evm' as const,
        chainId,
        to: step.chainflipSpecific.depositAddress,
        data: '0x',
        value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      }
    }

    if (step.nearIntentsSpecific?.depositAddress) {
      const depositAddress = step.nearIntentsSpecific.depositAddress
      const value = step.sellAmountIncludingProtocolFeesCryptoBaseUnit
      const contractAddress = contractAddressOrUndefined(step.sellAsset.assetId)

      if (contractAddress) {
        return {
          type: 'evm' as const,
          chainId,
          to: contractAddress,
          data: evm.getErc20Data(depositAddress, value, contractAddress),
          value: '0',
        }
      }

      return {
        type: 'evm' as const,
        chainId,
        to: depositAddress,
        data: '0x',
        value,
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
  if (step.transactionData?.type === 'utxo') {
    return {
      type: 'utxo_deposit',
      depositAddress: step.transactionData.to,
      memo: step.transactionData.opReturnData,
      value: step.transactionData.value,
    }
  }

  if (step.chainflipSpecific?.depositAddress) {
    return {
      type: 'utxo_deposit',
      depositAddress: step.chainflipSpecific.depositAddress,
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
