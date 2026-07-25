import { CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import { bn, contractAddressOrUndefined } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import {
  ATA_RENT_LAMPORTS,
  getSolanaNetworkFeeCryptoBaseUnit,
  SOLANA_PLACEHOLDER_ADDRESS,
} from '../../../solana-utils'
import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeNetworkFeeEstimationFailedErr, makeSwapErrorRight } from '../../../utils'
import { getUtxoNetworkFeeCryptoBaseUnit, UTXO_PLACEHOLDER_ADDRESS } from '../../../utxo-utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'

const SAFE_GAS_LIMIT = '100000'

type BaseArgs = {
  sellAmountCryptoBaseUnit: string
}

export type GetChainflipStepDataArgs = StepDataArgs<
  BaseArgs,
  { depositAddress?: undefined },
  { depositAddress: string }
>

type ChainflipRateStepData = {
  networkFeeCryptoBaseUnit: string | undefined
}

// transactionData for migrated namespaces; tron is un-migrated (exec builds from the deposit address)
type ChainflipQuoteStepData = {
  transactionData?: TxBuildData
  networkFeeCryptoBaseUnit: string | undefined
}

export function getChainflipStepData(
  args: Extract<GetChainflipStepDataArgs, { type: 'rate' }>,
): Promise<Result<ChainflipRateStepData, SwapErrorRight>>
export function getChainflipStepData(
  args: Extract<GetChainflipStepDataArgs, { type: 'quote' }>,
): Promise<Result<ChainflipQuoteStepData, SwapErrorRight>>
export async function getChainflipStepData(
  args: GetChainflipStepDataArgs,
): Promise<Result<ChainflipRateStepData | ChainflipQuoteStepData, SwapErrorRight>> {
  const { deps, type, input, sellAsset, sellAmountCryptoBaseUnit, depositAddress, from } = args

  const { chainNamespace } = fromAssetId(sellAsset.assetId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
      const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

      if (type === 'rate') {
        try {
          const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
            adapter,
            supportsEIP1559,
            gasLimit: SAFE_GAS_LIMIT,
          })

          const stepData: ChainflipRateStepData = { networkFeeCryptoBaseUnit }

          return Ok(stepData)
        } catch (error) {
          return Err(makeNetworkFeeEstimationFailedErr('getChainflipStepData', error))
        }
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

      try {
        const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
          adapter,
          transactionData,
          from,
          supportsEIP1559,
        })

        const stepData: ChainflipQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

        return Ok(stepData)
      } catch (error) {
        return Err(makeNetworkFeeEstimationFailedErr('getChainflipStepData', error))
      }
    }
    case CHAIN_NAMESPACE.Utxo: {
      const adapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)

      try {
        const { networkFeeCryptoBaseUnit } = await getUtxoNetworkFeeCryptoBaseUnit({
          adapter,
          pubkey: 'xpub' in input ? input.xpub : undefined,
          to: depositAddress ?? UTXO_PLACEHOLDER_ADDRESS,
          value: sellAmountCryptoBaseUnit,
        })

        if (type === 'rate') {
          const stepData: ChainflipRateStepData = { networkFeeCryptoBaseUnit }

          return Ok(stepData)
        }

        const transactionData: TxBuildData = {
          type: 'utxo',
          to: depositAddress,
          value: sellAmountCryptoBaseUnit,
        }

        const stepData: ChainflipQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

        return Ok(stepData)
      } catch (error) {
        return Err(makeNetworkFeeEstimationFailedErr('getChainflipStepData', error))
      }
    }
    case CHAIN_NAMESPACE.Solana: {
      const adapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)
      const tokenId = contractAddressOrUndefined(sellAsset.assetId)

      try {
        if (type === 'rate') {
          // No deposit channel yet - estimate via a self transfer (placeholder sender when walletless),
          // plus static ATA rent for token sells since the transfer omits the deposit ATA creation
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

          const stepData: ChainflipRateStepData = {
            networkFeeCryptoBaseUnit: bn(networkFeeCryptoBaseUnit)
              .plus(tokenId ? ATA_RENT_LAMPORTS : 0)
              .toString(),
          }

          return Ok(stepData)
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

        const stepData: ChainflipQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

        return Ok(stepData)
      } catch (error) {
        return Err(makeNetworkFeeEstimationFailedErr('getChainflipStepData', error))
      }
    }
    // Un-migrated - exec builds its tx from chainflipSpecific.depositAddress, so no transactionData is carried
    case CHAIN_NAMESPACE.Tron: {
      const to = depositAddress ?? from
      if (!to || !from) {
        const stepData: ChainflipRateStepData = { networkFeeCryptoBaseUnit: undefined }

        return Ok(stepData)
      }

      try {
        const { fast } = await deps.assertGetTronChainAdapter(sellAsset.chainId).getFeeData({
          to,
          value: sellAmountCryptoBaseUnit,
          chainSpecific: {
            from,
            contractAddress: contractAddressOrUndefined(sellAsset.assetId),
          },
        })

        const stepData: ChainflipQuoteStepData = { networkFeeCryptoBaseUnit: fast.txFee }

        return Ok(stepData)
      } catch (error) {
        return Err(makeNetworkFeeEstimationFailedErr('getChainflipStepData', error))
      }
    }
    default:
      return Err(
        makeSwapErrorRight({
          message: `[getChainflipStepData] unsupported chainNamespace: ${chainNamespace}`,
          code: TradeQuoteError.UnsupportedChain,
        }),
      )
  }
}
