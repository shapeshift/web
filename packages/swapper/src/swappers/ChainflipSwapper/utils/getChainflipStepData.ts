import { CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import { bn, contractAddressOrUndefined } from '@shapeshiftoss/utils'

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
import { getUtxoNetworkFeeCryptoBaseUnit, UTXO_PLACEHOLDER_ADDRESS } from '../../../utxo-utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'

const SAFE_GAS_LIMIT = '100000'

type BaseArgs = {
  sellAmountCryptoBaseUnit: string
}

type GetChainflipStepDataArgs = StepDataArgs<
  BaseArgs,
  { depositAddress?: undefined },
  { depositAddress: string }
>

export const getChainflipStepData = async ({
  deps,
  type,
  input,
  sellAsset,
  sellAmountCryptoBaseUnit,
  depositAddress,
  from,
}: GetChainflipStepDataArgs): Promise<{
  transactionData?: TxBuildData
  networkFeeCryptoBaseUnit: string | undefined
}> => {
  const { chainNamespace } = fromAssetId(sellAsset.assetId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
      const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

      if (type === 'rate') {
        const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
          adapter,
          supportsEIP1559,
          gasLimit: SAFE_GAS_LIMIT,
        })

        return { networkFeeCryptoBaseUnit }
      }

      const contractAddress = contractAddressOrUndefined(sellAsset.assetId)
      const data = evm.getErc20Data(depositAddress, sellAmountCryptoBaseUnit, contractAddress)

      const transactionData: TxBuildData = {
        type: 'evm',
        chainId: Number(fromChainId(sellAsset.chainId).chainReference),
        to: contractAddress ?? depositAddress,
        data: data || '0x',
        value: isNativeEvmAsset(sellAsset.assetId) ? sellAmountCryptoBaseUnit : '0',
      }

      const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
        adapter,
        transactionData,
        from,
        supportsEIP1559,
      })

      return { transactionData, networkFeeCryptoBaseUnit }
    }
    case CHAIN_NAMESPACE.Utxo: {
      const adapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)

      const { networkFeeCryptoBaseUnit } = await getUtxoNetworkFeeCryptoBaseUnit({
        adapter,
        pubkey: 'xpub' in input ? input.xpub : undefined,
        to: depositAddress ?? UTXO_PLACEHOLDER_ADDRESS,
        value: sellAmountCryptoBaseUnit,
      })

      if (type === 'rate') return { networkFeeCryptoBaseUnit }

      const transactionData: TxBuildData = {
        type: 'utxo',
        to: depositAddress,
        value: sellAmountCryptoBaseUnit,
      }

      return { transactionData, networkFeeCryptoBaseUnit }
    }
    case CHAIN_NAMESPACE.Solana: {
      const adapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)
      const tokenId = contractAddressOrUndefined(sellAsset.assetId)

      if (type === 'rate') {
        // Rates have no deposit channel; estimate with a self transfer from the send address, or
        // from a funded placeholder (1 lamport, native shape) when no wallet is connected. The
        // self transfer can't include the deposit token account creation (fresh channels always
        // need one), so the static rent is added for token sells
        const address = from ?? SOLANA_PLACEHOLDER_ADDRESS

        const instructions = await adapter.buildTransferInstructions({
          from: address,
          to: address,
          tokenId: from ? tokenId : undefined,
          value: from ? sellAmountCryptoBaseUnit : '1',
        })

        const { networkFeeCryptoBaseUnit } = await getSolanaNetworkFeeCryptoBaseUnit({
          adapter,
          from: address,
          instructions,
          tokenId,
        })

        return {
          networkFeeCryptoBaseUnit: bn(networkFeeCryptoBaseUnit)
            .plus(tokenId ? ATA_RENT_LAMPORTS : 0)
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
      const to = depositAddress ?? from
      if (!to || !from) return { networkFeeCryptoBaseUnit: undefined }

      const { fast } = await deps.assertGetTronChainAdapter(sellAsset.chainId).getFeeData({
        to,
        value: sellAmountCryptoBaseUnit,
        chainSpecific: {
          from,
          contractAddress: contractAddressOrUndefined(sellAsset.assetId),
        },
      })

      // Tron exec builds its tx from chainflipSpecific.depositAddress, so no transactionData is carried
      return { networkFeeCryptoBaseUnit: fast.txFee }
    }
    default:
      throw new Error('Unsupported chainNamespace')
  }
}
