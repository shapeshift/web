import { CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'
import { ComputeBudgetProgram } from '@solana/web3.js'

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import type {
  CommonTradeQuoteInput,
  GetEvmTradeRateInput,
  GetTradeRateInput,
  GetUtxoTradeQuoteInput,
  SwapperDeps,
  TxBuildData,
} from '../../../types'
import { getUtxoNetworkFeeCryptoBaseUnit, UTXO_PLACEHOLDER_ADDRESS } from '../../../utxo-utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'

const SAFE_GAS_LIMIT = '100000'

type BaseArgs = {
  deps: SwapperDeps
  sellAsset: Asset
  sellAmountCryptoBaseUnit: string
}

type RateArgs = BaseArgs & {
  type: 'rate'
  input: GetTradeRateInput
  depositAddress?: undefined
  from?: undefined
}

type QuoteArgs = BaseArgs & {
  type: 'quote'
  input: CommonTradeQuoteInput
  depositAddress: string
  from: string
}

type GetChainflipStepDataArgs = RateArgs | QuoteArgs

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
  chainSpecific?: { satsPerByte: string }
}> => {
  const { chainNamespace } = fromAssetId(sellAsset.assetId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
      const supportsEIP1559 = (input as GetEvmTradeRateInput).supportsEIP1559

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
    case CHAIN_NAMESPACE.Solana: {
      const to = depositAddress ?? input.sendAddress
      if (!to || !input.sendAddress) return { networkFeeCryptoBaseUnit: undefined }

      const adapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)

      const { fast } = await adapter.getFeeData({
        to,
        value: sellAmountCryptoBaseUnit,
        chainSpecific: {
          from: input.sendAddress,
          tokenId: contractAddressOrUndefined(sellAsset.assetId),
        },
      })

      // Only an executable quote (deposit channel known) carries tx data; exec reads it via transactionData
      if (type === 'rate') return { networkFeeCryptoBaseUnit: fast.txFee }

      // Business instructions only; compute budget is dynamic and must be derived at execution time
      const instructions = (
        await adapter.buildEstimationInstructions({
          from: input.sendAddress,
          to: depositAddress,
          tokenId: contractAddressOrUndefined(sellAsset.assetId),
          value: sellAmountCryptoBaseUnit,
        })
      ).filter(
        instruction =>
          instruction.programId.toString() !== ComputeBudgetProgram.programId.toString(),
      )

      return {
        transactionData: { type: 'solana', instructions, addressLookupTableAddresses: [] },
        networkFeeCryptoBaseUnit: fast.txFee,
      }
    }
    case CHAIN_NAMESPACE.Utxo: {
      const adapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)

      const { networkFeeCryptoBaseUnit, satsPerByte } = await getUtxoNetworkFeeCryptoBaseUnit({
        adapter,
        pubkey: (input as GetUtxoTradeQuoteInput).xpub,
        to: depositAddress ?? UTXO_PLACEHOLDER_ADDRESS,
        value: sellAmountCryptoBaseUnit,
      })

      if (type === 'rate') return { networkFeeCryptoBaseUnit, chainSpecific: { satsPerByte } }

      const transactionData: TxBuildData = {
        type: 'utxo',
        to: depositAddress,
        value: sellAmountCryptoBaseUnit,
      }

      return { transactionData, networkFeeCryptoBaseUnit, chainSpecific: { satsPerByte } }
    }
    case CHAIN_NAMESPACE.Tron: {
      const to = depositAddress ?? input.sendAddress
      if (!to || !input.sendAddress) return { networkFeeCryptoBaseUnit: undefined }

      const { fast } = await deps.assertGetTronChainAdapter(sellAsset.chainId).getFeeData({
        to,
        value: sellAmountCryptoBaseUnit,
        chainSpecific: {
          from: input.sendAddress,
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
