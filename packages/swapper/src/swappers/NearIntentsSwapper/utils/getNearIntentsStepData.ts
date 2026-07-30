import { CHAIN_NAMESPACE, fromAssetId, fromChainId, monadChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import { bn, contractAddressOrUndefined } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { Hex } from 'viem'
import { getAddress } from 'viem'

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
import { RATE_SIM_TIMEOUT_MS, simulateWithStateOverrides } from '../../../utils/tenderly'
import { getUtxoNetworkFeeCryptoBaseUnit } from '../../../utils/utxo'

// Deposits are plain (token) transfers with constant measured compute consumption (max 15394 CU
// with ata creation), so the margin is safety only; the floor guarantees the limit covers full
// ata recreation if the deposit ata is closed between simulation and landing (a no-op create
// simulates ~3x cheaper than a real one)
export const NEAR_INTENTS_SOLANA_COMPUTE_BUDGET: SolanaComputeBudgetOptions = {
  marginMultiplier: 1.1,
  minComputeUnits: 20_000,
}

type BaseArgs = {
  sellAmountCryptoBaseUnit: string
  depositAddress: string
}

export type GetNearIntentsStepDataArgs = StepDataArgs<BaseArgs>

// Un-migrated namespaces (tron/sui/starknet/near/ton) never build transactionData - exec does; a
// walletless rate can also come back without a fee
type NearIntentsRateStepData = { networkFeeCryptoBaseUnit: string | undefined }
type NearIntentsQuoteStepData = {
  transactionData?: TxBuildData
  networkFeeCryptoBaseUnit: string
}

export function getNearIntentsStepData(
  args: Extract<GetNearIntentsStepDataArgs, { type: 'rate' }>,
): Promise<Result<NearIntentsRateStepData, SwapErrorRight>>
export function getNearIntentsStepData(
  args: Extract<GetNearIntentsStepDataArgs, { type: 'quote' }>,
): Promise<Result<NearIntentsQuoteStepData, SwapErrorRight>>
export async function getNearIntentsStepData(
  args: GetNearIntentsStepDataArgs,
): Promise<Result<NearIntentsRateStepData | NearIntentsQuoteStepData, SwapErrorRight>> {
  const { deps, type, input, sellAsset, sellAmountCryptoBaseUnit, from, depositAddress } = args
  const { chainNamespace } = fromAssetId(sellAsset.assetId)
  const contractAddress = contractAddressOrUndefined(sellAsset.assetId)

  try {
    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Evm: {
        const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
        const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

        const transactionData: TxBuildData = {
          type: 'evm',
          chainId: Number(fromChainId(sellAsset.chainId).chainReference),
          to: contractAddress ?? depositAddress,
          data: evm.getErc20Data(depositAddress, sellAmountCryptoBaseUnit, contractAddress) || '0x',
          value: isNativeEvmAsset(sellAsset.assetId) ? sellAmountCryptoBaseUnit : '0',
        }

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
              timeoutMs: RATE_SIM_TIMEOUT_MS,
            },
            {
              apiKey: deps.config.VITE_TENDERLY_API_KEY,
              accountSlug: deps.config.VITE_TENDERLY_ACCOUNT_SLUG,
              projectSlug: deps.config.VITE_TENDERLY_PROJECT_SLUG,
            },
          )

          if (!simulationResult.success) {
            const stepData: NearIntentsRateStepData = { networkFeeCryptoBaseUnit: '0' }

            return Ok(stepData)
          }

          const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
            adapter,
            supportsEIP1559,
            gasLimit: simulationResult.gasLimit.toString(),
          })

          const stepData: NearIntentsRateStepData = { networkFeeCryptoBaseUnit }

          return Ok(stepData)
        }

        const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
          adapter,
          transactionData,
          from: from || depositAddress,
          supportsEIP1559,
        })

        if (type === 'rate') {
          const stepData: NearIntentsRateStepData = { networkFeeCryptoBaseUnit }

          return Ok(stepData)
        }

        const stepData: NearIntentsQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

        return Ok(stepData)
      }
      case CHAIN_NAMESPACE.Utxo: {
        const adapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)

        const { networkFeeCryptoBaseUnit } = await getUtxoNetworkFeeCryptoBaseUnit({
          adapter,
          pubkey: 'xpub' in input ? input.xpub : undefined,
          to: depositAddress,
          value: sellAmountCryptoBaseUnit,
        })

        if (type === 'rate') {
          const stepData: NearIntentsRateStepData = { networkFeeCryptoBaseUnit }

          return Ok(stepData)
        }

        const stepData: NearIntentsQuoteStepData = {
          transactionData: { type: 'utxo', to: depositAddress, value: sellAmountCryptoBaseUnit },
          networkFeeCryptoBaseUnit,
        }

        return Ok(stepData)
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

          const stepData: NearIntentsRateStepData = {
            networkFeeCryptoBaseUnit: bn(transactionFeeCryptoBaseUnit)
              .plus(ataCreationRent)
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
            computeBudget: NEAR_INTENTS_SOLANA_COMPUTE_BUDGET,
          }),
          addressLookupTableAddresses: [],
        }

        const stepData: NearIntentsQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

        return Ok(stepData)
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

        const stepData: NearIntentsQuoteStepData = { networkFeeCryptoBaseUnit: fast.txFee }

        return Ok(stepData)
      }
      case CHAIN_NAMESPACE.Sui: {
        if (!from) {
          const stepData: NearIntentsRateStepData = { networkFeeCryptoBaseUnit: undefined }

          return Ok(stepData)
        }

        const { fast } = await deps.assertGetSuiChainAdapter(sellAsset.chainId).getFeeData({
          to: depositAddress,
          value: sellAmountCryptoBaseUnit,
          chainSpecific: {
            from,
            tokenId: contractAddressOrUndefined(sellAsset.assetId),
          },
          sendMax: false,
        })

        const stepData: NearIntentsQuoteStepData = { networkFeeCryptoBaseUnit: fast.txFee }

        return Ok(stepData)
      }
      case CHAIN_NAMESPACE.Starknet: {
        if (!from) {
          const stepData: NearIntentsRateStepData = { networkFeeCryptoBaseUnit: undefined }

          return Ok(stepData)
        }

        const { fast } = await deps.assertGetStarknetChainAdapter(sellAsset.chainId).getFeeData({
          to: depositAddress,
          value: sellAmountCryptoBaseUnit,
          chainSpecific: {
            from,
            tokenContractAddress: contractAddressOrUndefined(sellAsset.assetId),
          },
          sendMax: false,
        })

        const stepData: NearIntentsQuoteStepData = { networkFeeCryptoBaseUnit: fast.txFee }

        return Ok(stepData)
      }
      case CHAIN_NAMESPACE.Near: {
        if (!from) {
          const stepData: NearIntentsRateStepData = { networkFeeCryptoBaseUnit: undefined }

          return Ok(stepData)
        }

        const { fast } = await deps.assertGetNearChainAdapter(sellAsset.chainId).getFeeData({
          to: depositAddress,
          value: sellAmountCryptoBaseUnit,
          chainSpecific: { from },
        })

        const stepData: NearIntentsQuoteStepData = { networkFeeCryptoBaseUnit: fast.txFee }

        return Ok(stepData)
      }
      case CHAIN_NAMESPACE.Ton: {
        if (!from) {
          const stepData: NearIntentsRateStepData = { networkFeeCryptoBaseUnit: undefined }

          return Ok(stepData)
        }

        const { fast } = await deps.assertGetTonChainAdapter(sellAsset.chainId).getFeeData({
          to: depositAddress,
          value: sellAmountCryptoBaseUnit,
          chainSpecific: {
            from,
            contractAddress: contractAddressOrUndefined(sellAsset.assetId),
          },
        })

        const stepData: NearIntentsQuoteStepData = { networkFeeCryptoBaseUnit: fast.txFee }

        return Ok(stepData)
      }
      default:
        return Err(
          makeSwapErrorRight({
            message: `[getNearIntentsStepData] unsupported chain namespace: ${chainNamespace}`,
            code: TradeQuoteError.UnsupportedChain,
          }),
        )
    }
  } catch (error) {
    // Rates are best effort with no provider fee to degrade to; quotes must price to execute
    if (type === 'rate') {
      const stepData: NearIntentsRateStepData = { networkFeeCryptoBaseUnit: undefined }

      return Ok(stepData)
    }

    return Err(makeNetworkFeeEstimationFailedErr('getNearIntentsStepData', error))
  }
}
