import { CHAIN_NAMESPACE, fromAssetId, fromChainId, monadChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { bn, contractAddressOrUndefined } from '@shapeshiftoss/utils'
import { ComputeBudgetProgram } from '@solana/web3.js'
import type { Hex } from 'viem'
import { getAddress } from 'viem'

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import { calculateAccountCreationCosts } from '../../../solana-utils'
import type {
  CommonTradeQuoteInput,
  GetTradeRateInput,
  GetUtxoTradeQuoteInput,
  GetUtxoTradeRateInput,
  SwapperDeps,
  TxBuildData,
} from '../../../types'
import { simulateWithStateOverrides } from '../../../utils/tenderly'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'

type NearIntentsStepDataArgs = {
  deps: SwapperDeps
  input: GetTradeRateInput | CommonTradeQuoteInput
  sellAsset: Asset
  sellAmountCryptoBaseUnit: string
  sendAddress: string | undefined
  depositAddress: string
}

const getEvmTransactionData = ({
  sellAsset,
  sellAmountCryptoBaseUnit,
  depositAddress,
}: Pick<
  NearIntentsStepDataArgs,
  'sellAsset' | 'sellAmountCryptoBaseUnit' | 'depositAddress'
>): Extract<TxBuildData, { type: 'evm' }> => {
  const contractAddress = contractAddressOrUndefined(sellAsset.assetId)

  return {
    type: 'evm',
    chainId: Number(fromChainId(sellAsset.chainId).chainReference),
    to: contractAddress ?? depositAddress,
    data: evm.getErc20Data(depositAddress, sellAmountCryptoBaseUnit, contractAddress) || '0x',
    value: isNativeEvmAsset(sellAsset.assetId) ? sellAmountCryptoBaseUnit : '0',
  }
}

export const getNearIntentsRateNetworkFeeCryptoBaseUnit = async (
  args: NearIntentsStepDataArgs,
): Promise<string | undefined> => {
  const { deps, input, sellAsset, sellAmountCryptoBaseUnit, sendAddress, depositAddress } = args
  const { chainNamespace } = fromAssetId(sellAsset.assetId)

  // Monad has no Tenderly support, so it falls through to the same estimate the quote uses
  const isSimulated = chainNamespace === CHAIN_NAMESPACE.Evm && sellAsset.chainId !== monadChainId
  if (!isSimulated) return (await getNearIntentsStepData(args)).networkFeeCryptoBaseUnit

  const transactionData = getEvmTransactionData({
    sellAsset,
    sellAmountCryptoBaseUnit,
    depositAddress,
  })

  // Evm rates simulate the deposit transfer rather than estimate it, so an unapproved or unfunded sender still prices
  const simulationResult = await simulateWithStateOverrides(
    {
      chainId: sellAsset.chainId,
      from: getAddress(sendAddress || depositAddress),
      to: getAddress(transactionData.to),
      data: transactionData.data as Hex,
      value: transactionData.value,
      sellAsset,
    },
    {
      apiKey: deps.config.VITE_TENDERLY_API_KEY,
      accountSlug: deps.config.VITE_TENDERLY_ACCOUNT_SLUG,
      projectSlug: deps.config.VITE_TENDERLY_PROJECT_SLUG,
    },
  )

  if (!simulationResult.success) return '0'

  return await getEvmNetworkFeeCryptoBaseUnit({
    adapter: deps.assertGetEvmChainAdapter(sellAsset.chainId),
    supportsEIP1559: Boolean('supportsEIP1559' in input ? input.supportsEIP1559 : false),
    gasLimit: simulationResult.gasLimit.toString(),
  })
}

export const getNearIntentsStepData = async ({
  deps,
  input,
  sellAsset,
  sellAmountCryptoBaseUnit,
  sendAddress,
  depositAddress,
}: NearIntentsStepDataArgs): Promise<{
  transactionData?: TxBuildData
  networkFeeCryptoBaseUnit: string | undefined
  chainSpecific?: { satsPerByte: string }
}> => {
  const { chainNamespace } = fromAssetId(sellAsset.assetId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      const transactionData = getEvmTransactionData({
        sellAsset,
        sellAmountCryptoBaseUnit,
        depositAddress,
      })

      const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
        adapter: deps.assertGetEvmChainAdapter(sellAsset.chainId),
        transactionData,
        from: sendAddress || depositAddress,
        supportsEIP1559: Boolean('supportsEIP1559' in input ? input.supportsEIP1559 : false),
      })

      return { transactionData, networkFeeCryptoBaseUnit }
    }
    case CHAIN_NAMESPACE.Utxo: {
      const pubkey = (input as GetUtxoTradeQuoteInput | GetUtxoTradeRateInput).xpub
      if (!pubkey) return { networkFeeCryptoBaseUnit: undefined }

      const adapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)

      const { fast } = await adapter.getFeeData({
        to: depositAddress,
        value: sellAmountCryptoBaseUnit,
        chainSpecific: { pubkey },
        sendMax: false,
      })

      // Utxo exec builds its tx from the deposit address carried on the swapper metadata
      return {
        networkFeeCryptoBaseUnit: fast.txFee,
        chainSpecific: { satsPerByte: fast.chainSpecific.satoshiPerByte },
      }
    }
    case CHAIN_NAMESPACE.Solana: {
      if (!sendAddress) return { networkFeeCryptoBaseUnit: undefined }

      const adapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)
      const tokenId = contractAddressOrUndefined(sellAsset.assetId)

      const instructions = await adapter.buildEstimationInstructions({
        from: sendAddress,
        to: depositAddress,
        tokenId,
        value: sellAmountCryptoBaseUnit,
      })

      const { fast } = await adapter.getFeeData({
        to: depositAddress,
        value: sellAmountCryptoBaseUnit,
        chainSpecific: { from: sendAddress, tokenId, instructions },
        sendMax: false,
      })

      const networkFeeCryptoBaseUnit = bn(fast.txFee)
        .plus(calculateAccountCreationCosts(instructions))
        .toString()

      return {
        networkFeeCryptoBaseUnit,
        // Business instructions only; compute budget is dynamic and must be derived at execution time
        transactionData: {
          type: 'solana',
          instructions: instructions.filter(
            instruction =>
              instruction.programId.toString() !== ComputeBudgetProgram.programId.toString(),
          ),
          addressLookupTableAddresses: [],
        },
      }
    }
    case CHAIN_NAMESPACE.Tron: {
      const { fast } = await deps.assertGetTronChainAdapter(sellAsset.chainId).getFeeData({
        to: depositAddress,
        value: sellAmountCryptoBaseUnit,
        chainSpecific: {
          from: sendAddress,
          contractAddress: contractAddressOrUndefined(sellAsset.assetId),
        },
      })

      return { networkFeeCryptoBaseUnit: fast.txFee }
    }
    case CHAIN_NAMESPACE.Sui: {
      if (!sendAddress) return { networkFeeCryptoBaseUnit: undefined }

      const { fast } = await deps.assertGetSuiChainAdapter(sellAsset.chainId).getFeeData({
        to: depositAddress,
        value: sellAmountCryptoBaseUnit,
        chainSpecific: {
          from: sendAddress,
          tokenId: contractAddressOrUndefined(sellAsset.assetId),
        },
        sendMax: false,
      })

      return { networkFeeCryptoBaseUnit: fast.txFee }
    }
    case CHAIN_NAMESPACE.Starknet: {
      if (!sendAddress) return { networkFeeCryptoBaseUnit: undefined }

      const { fast } = await deps.assertGetStarknetChainAdapter(sellAsset.chainId).getFeeData({
        to: depositAddress,
        value: sellAmountCryptoBaseUnit,
        chainSpecific: {
          from: sendAddress,
          tokenContractAddress: contractAddressOrUndefined(sellAsset.assetId),
        },
        sendMax: false,
      })

      return { networkFeeCryptoBaseUnit: fast.txFee }
    }
    case CHAIN_NAMESPACE.Near: {
      if (!sendAddress) return { networkFeeCryptoBaseUnit: undefined }

      const { fast } = await deps.assertGetNearChainAdapter(sellAsset.chainId).getFeeData({
        to: depositAddress,
        value: sellAmountCryptoBaseUnit,
        chainSpecific: { from: sendAddress },
      })

      return { networkFeeCryptoBaseUnit: fast.txFee }
    }
    case CHAIN_NAMESPACE.Ton: {
      if (!sendAddress) return { networkFeeCryptoBaseUnit: undefined }

      const { fast } = await deps.assertGetTonChainAdapter(sellAsset.chainId).getFeeData({
        to: depositAddress,
        value: sellAmountCryptoBaseUnit,
        chainSpecific: {
          from: sendAddress,
          contractAddress: contractAddressOrUndefined(sellAsset.assetId),
        },
      })

      return { networkFeeCryptoBaseUnit: fast.txFee }
    }
    default:
      throw new Error(`Unsupported chain namespace: ${chainNamespace}`)
  }
}
