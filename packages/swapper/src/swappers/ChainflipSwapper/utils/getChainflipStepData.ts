import { CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import { bn, contractAddressOrUndefined } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeNetworkFeeEstimationFailedErr, makeSwapErrorRight } from '../../../utils'
import { getEvmNetworkFeeCryptoBaseUnit } from '../../../utils/evm'
import { isNativeEvmAsset } from '../../../utils/helpers'
import type { SolanaComputeBudgetOptions } from '../../../utils/solana'
import {
  ATA_RENT_LAMPORTS,
  getSolanaNetworkFeeCryptoBaseUnit,
  SOLANA_PLACEHOLDER_ADDRESS,
  withComputeUnitLimit,
} from '../../../utils/solana'
import { TRON_PLACEHOLDER_ADDRESS } from '../../../utils/tron'
import { getUtxoNetworkFeeCryptoBaseUnit, UTXO_PLACEHOLDER_ADDRESS } from '../../../utils/utxo'

// Deposits are plain transfers - 21k intrinsic for natives, tokens measured ~50-65k to a fresh
// deposit address across the supported set (usdc/usdt/flip)
const SAFE_NATIVE_TRANSFER_GAS_LIMIT = '21000'
const SAFE_TOKEN_TRANSFER_GAS_LIMIT = '65000'

// Deposits are plain (token) transfers with constant measured compute consumption (max 15394 CU
// with ata creation), so the margin is safety only; the floor guarantees the limit covers full
// ata recreation if the deposit ata is closed between simulation and landing (a no-op create
// simulates ~3x cheaper than a real one)
export const CHAINFLIP_SOLANA_COMPUTE_BUDGET: SolanaComputeBudgetOptions = {
  marginMultiplier: 1.1,
  minComputeUnits: 20_000,
}

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

type ChainflipQuoteStepData = {
  transactionData: TxBuildData
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
            gasLimit: isNativeEvmAsset(sellAsset.assetId)
              ? SAFE_NATIVE_TRANSFER_GAS_LIMIT
              : SAFE_TOKEN_TRANSFER_GAS_LIMIT,
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
        // The deposit is a plain (token) transfer with no approval involved, but estimation
        // still reverts for an unfunded sender - override the missing balance only
        const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
          adapter,
          transactionData,
          from,
          supportsEIP1559,
          stateOverride: { sellAsset, sellAmountCryptoBaseUnit },
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

        const { networkFeeCryptoBaseUnit, feeData, includeComputeBudget } =
          await getSolanaNetworkFeeCryptoBaseUnit({
            adapter,
            from,
            instructions,
            tokenId,
          })

        const transactionData: TxBuildData = {
          type: 'solana_instructions',
          instructions: withComputeUnitLimit({
            instructions,
            computeUnits: feeData.chainSpecific.computeUnits,
            includeComputeBudget,
            computeBudget: CHAINFLIP_SOLANA_COMPUTE_BUDGET,
          }),
          addressLookupTableAddresses: [],
        }

        const stepData: ChainflipQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

        return Ok(stepData)
      } catch (error) {
        return Err(makeNetworkFeeEstimationFailedErr('getChainflipStepData', error))
      }
    }
    case CHAIN_NAMESPACE.Tron: {
      const adapter = deps.assertGetTronChainAdapter(sellAsset.chainId)
      const contractAddress = contractAddressOrUndefined(sellAsset.assetId)

      if (args.type === 'rate') {
        // No deposit address yet - a placeholder recipient sizes the transfer
        const networkFeeCryptoBaseUnit = await (async () => {
          if (!from) return

          try {
            const { fast } = await adapter.getFeeData({
              to: TRON_PLACEHOLDER_ADDRESS,
              value: sellAmountCryptoBaseUnit,
              chainSpecific: { from, contractAddress },
            })

            return fast.txFee
          } catch {}
        })()

        const stepData: ChainflipRateStepData = { networkFeeCryptoBaseUnit }

        return Ok(stepData)
      }

      const transactionData: TxBuildData = {
        type: 'tron',
        to: args.depositAddress,
        value: sellAmountCryptoBaseUnit,
      }

      try {
        const { fast } = await adapter.getFeeData({
          to: transactionData.to,
          value: transactionData.value,
          chainSpecific: { from, contractAddress },
        })

        const stepData: ChainflipQuoteStepData = {
          transactionData,
          networkFeeCryptoBaseUnit: fast.txFee,
        }

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
