import { CHAIN_NAMESPACE, fromAssetId, fromChainId, monadChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { bn, contractAddressOrUndefined } from '@shapeshiftoss/utils'
import type { Hex } from 'viem'
import { getAddress } from 'viem'

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import {
  ATA_RENT_LAMPORTS,
  getSolanaNetworkFeeCryptoBaseUnit,
  SOLANA_PLACEHOLDER_ADDRESS,
} from '../../../solana-utils'
import type {
  CommonTradeQuoteInput,
  GetTradeRateInput,
  GetUtxoTradeQuoteInput,
  GetUtxoTradeRateInput,
  SwapperDeps,
  TxBuildData,
} from '../../../types'
import { simulateWithStateOverrides } from '../../../utils/tenderly'
import { getUtxoNetworkFeeCryptoBaseUnit } from '../../../utxo-utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'

type BaseArgs = {
  deps: SwapperDeps
  sellAsset: Asset
  sellAmountCryptoBaseUnit: string
  depositAddress: string
}

type RateArgs = BaseArgs & {
  type: 'rate'
  input: GetTradeRateInput
  sendAddress?: string
}

type QuoteArgs = BaseArgs & {
  type: 'quote'
  input: CommonTradeQuoteInput
  sendAddress: string
}

type NearIntentsStepDataArgs = RateArgs | QuoteArgs

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
  args: RateArgs,
): Promise<string | undefined> => {
  const { deps, input, sellAsset, sellAmountCryptoBaseUnit, sendAddress, depositAddress } = args
  const { chainNamespace } = fromAssetId(sellAsset.assetId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      // Monad has no Tenderly support
      if (sellAsset.chainId === monadChainId) {
        const { networkFeeCryptoBaseUnit } = await getNearIntentsStepData(args)
        return networkFeeCryptoBaseUnit
      }

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

      const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
        adapter: deps.assertGetEvmChainAdapter(sellAsset.chainId),
        supportsEIP1559: Boolean('supportsEIP1559' in input ? input.supportsEIP1559 : false),
        gasLimit: simulationResult.gasLimit.toString(),
      })

      return networkFeeCryptoBaseUnit
    }
    default: {
      const { networkFeeCryptoBaseUnit } = await getNearIntentsStepData(args)
      return networkFeeCryptoBaseUnit
    }
  }
}

export const getNearIntentsStepData = async ({
  deps,
  type,
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
      const adapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)

      const { networkFeeCryptoBaseUnit, satsPerByte } = await getUtxoNetworkFeeCryptoBaseUnit({
        adapter,
        pubkey: (input as GetUtxoTradeQuoteInput | GetUtxoTradeRateInput).xpub,
        to: depositAddress,
        value: sellAmountCryptoBaseUnit,
      })

      return {
        transactionData: { type: 'utxo', to: depositAddress, value: sellAmountCryptoBaseUnit },
        networkFeeCryptoBaseUnit,
        chainSpecific: { satsPerByte },
      }
    }
    case CHAIN_NAMESPACE.Solana: {
      const adapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)
      const tokenId = contractAddressOrUndefined(sellAsset.assetId)

      if (type === 'rate') {
        // Rates estimate with a transfer from the send address, or a self transfer from the
        // funded placeholder (1 lamport, native shape) when no wallet is connected; fresh
        // deposit addresses always need their token account created, so rent is included
        const address = sendAddress ?? SOLANA_PLACEHOLDER_ADDRESS

        const instructions = await adapter.buildTransferInstructions({
          from: address,
          to: sendAddress ? depositAddress : address,
          tokenId: sendAddress ? tokenId : undefined,
          value: sendAddress ? sellAmountCryptoBaseUnit : '1',
        })

        const { networkFeeCryptoBaseUnit: transactionFeeCryptoBaseUnit } =
          await getSolanaNetworkFeeCryptoBaseUnit({
            adapter,
            from: address,
            instructions,
            tokenId,
          })

        // The walletless native shape can't include the deposit token account creation
        const ataCreationRent = !sendAddress && tokenId ? ATA_RENT_LAMPORTS : 0

        return {
          networkFeeCryptoBaseUnit: bn(transactionFeeCryptoBaseUnit)
            .plus(ataCreationRent)
            .toString(),
        }
      }

      const instructions = await adapter.buildTransferInstructions({
        from: sendAddress,
        to: depositAddress,
        tokenId,
        value: sellAmountCryptoBaseUnit,
      })

      const transactionData: TxBuildData = {
        type: 'solana',
        instructions,
        addressLookupTableAddresses: [],
      }

      const { networkFeeCryptoBaseUnit } = await getSolanaNetworkFeeCryptoBaseUnit({
        adapter,
        from: sendAddress,
        instructions,
        tokenId,
      })

      return { transactionData, networkFeeCryptoBaseUnit }
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
