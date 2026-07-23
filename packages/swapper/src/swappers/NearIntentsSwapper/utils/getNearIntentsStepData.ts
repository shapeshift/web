import { CHAIN_NAMESPACE, fromAssetId, fromChainId, monadChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
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
  StepDataArgs,
  TxBuildData,
} from '../../../types'
import { simulateWithStateOverrides } from '../../../utils/tenderly'
import { getUtxoNetworkFeeCryptoBaseUnit } from '../../../utxo-utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'

type BaseArgs = {
  sellAmountCryptoBaseUnit: string
  depositAddress: string
}

type NearIntentsStepDataArgs = StepDataArgs<BaseArgs>

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

export const getNearIntentsStepData = async ({
  deps,
  type,
  input,
  sellAsset,
  sellAmountCryptoBaseUnit,
  from,
  depositAddress,
}: NearIntentsStepDataArgs): Promise<{
  transactionData?: TxBuildData
  networkFeeCryptoBaseUnit: string | undefined
}> => {
  const { chainNamespace } = fromAssetId(sellAsset.assetId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
      const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

      const transactionData = getEvmTransactionData({
        sellAsset,
        sellAmountCryptoBaseUnit,
        depositAddress,
      })

      // Rates simulate the deposit transfer rather than estimate it, so an unapproved or
      // unfunded sender still prices (Monad has no Tenderly support, so it estimates like quotes)
      if (type === 'rate' && sellAsset.chainId !== monadChainId) {
        const simulationResult = await simulateWithStateOverrides(
          {
            chainId: sellAsset.chainId,
            from: getAddress(from || depositAddress),
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

        if (!simulationResult.success) return { networkFeeCryptoBaseUnit: '0' }

        const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
          adapter,
          supportsEIP1559,
          gasLimit: simulationResult.gasLimit.toString(),
        })

        return { networkFeeCryptoBaseUnit }
      }

      const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
        adapter,
        transactionData,
        from: from || depositAddress,
        supportsEIP1559,
      })

      if (type === 'rate') return { networkFeeCryptoBaseUnit }

      return { transactionData, networkFeeCryptoBaseUnit }
    }
    case CHAIN_NAMESPACE.Utxo: {
      const adapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)

      const { networkFeeCryptoBaseUnit } = await getUtxoNetworkFeeCryptoBaseUnit({
        adapter,
        pubkey: 'xpub' in input ? input.xpub : undefined,
        to: depositAddress,
        value: sellAmountCryptoBaseUnit,
      })

      if (type === 'rate') return { networkFeeCryptoBaseUnit }

      return {
        transactionData: { type: 'utxo', to: depositAddress, value: sellAmountCryptoBaseUnit },
        networkFeeCryptoBaseUnit,
      }
    }
    case CHAIN_NAMESPACE.Solana: {
      const adapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)
      const tokenId = contractAddressOrUndefined(sellAsset.assetId)

      if (type === 'rate') {
        // Rates estimate with a transfer from the send address, or a self transfer from the
        // funded placeholder (1 lamport, native shape) when no wallet is connected; fresh
        // deposit addresses always need their token account created, so rent is included
        const address = from ?? SOLANA_PLACEHOLDER_ADDRESS

        const instructions = await adapter.buildTransferInstructions({
          from: address,
          to: from ? depositAddress : address,
          tokenId: from ? tokenId : undefined,
          value: from ? sellAmountCryptoBaseUnit : '1',
        })

        const { networkFeeCryptoBaseUnit: transactionFeeCryptoBaseUnit } =
          await getSolanaNetworkFeeCryptoBaseUnit({
            adapter,
            from: address,
            instructions,
            tokenId,
          })

        // The walletless native shape can't include the deposit token account creation
        const ataCreationRent = !from && tokenId ? ATA_RENT_LAMPORTS : 0

        return {
          networkFeeCryptoBaseUnit: bn(transactionFeeCryptoBaseUnit)
            .plus(ataCreationRent)
            .toString(),
        }
      }

      const instructions = await adapter.buildTransferInstructions({
        from,
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
        from,
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
          from,
          contractAddress: contractAddressOrUndefined(sellAsset.assetId),
        },
      })

      return { networkFeeCryptoBaseUnit: fast.txFee }
    }
    case CHAIN_NAMESPACE.Sui: {
      if (!from) return { networkFeeCryptoBaseUnit: undefined }

      const { fast } = await deps.assertGetSuiChainAdapter(sellAsset.chainId).getFeeData({
        to: depositAddress,
        value: sellAmountCryptoBaseUnit,
        chainSpecific: {
          from,
          tokenId: contractAddressOrUndefined(sellAsset.assetId),
        },
        sendMax: false,
      })

      return { networkFeeCryptoBaseUnit: fast.txFee }
    }
    case CHAIN_NAMESPACE.Starknet: {
      if (!from) return { networkFeeCryptoBaseUnit: undefined }

      const { fast } = await deps.assertGetStarknetChainAdapter(sellAsset.chainId).getFeeData({
        to: depositAddress,
        value: sellAmountCryptoBaseUnit,
        chainSpecific: {
          from,
          tokenContractAddress: contractAddressOrUndefined(sellAsset.assetId),
        },
        sendMax: false,
      })

      return { networkFeeCryptoBaseUnit: fast.txFee }
    }
    case CHAIN_NAMESPACE.Near: {
      if (!from) return { networkFeeCryptoBaseUnit: undefined }

      const { fast } = await deps.assertGetNearChainAdapter(sellAsset.chainId).getFeeData({
        to: depositAddress,
        value: sellAmountCryptoBaseUnit,
        chainSpecific: { from },
      })

      return { networkFeeCryptoBaseUnit: fast.txFee }
    }
    case CHAIN_NAMESPACE.Ton: {
      if (!from) return { networkFeeCryptoBaseUnit: undefined }

      const { fast } = await deps.assertGetTonChainAdapter(sellAsset.chainId).getFeeData({
        to: depositAddress,
        value: sellAmountCryptoBaseUnit,
        chainSpecific: {
          from,
          contractAddress: contractAddressOrUndefined(sellAsset.assetId),
        },
      })

      return { networkFeeCryptoBaseUnit: fast.txFee }
    }
    default:
      throw new Error(`Unsupported chain namespace: ${chainNamespace}`)
  }
}
