import {
  CHAIN_NAMESPACE,
  cosmosAssetId,
  fromAssetId,
  fromChainId,
  mayachainAssetId,
  rujiAssetId,
  tcyAssetId,
  thorchainAssetId,
} from '@shapeshiftoss/caip'
import { THOR_ROUTER_CONTRACT_MAINNET } from '@shapeshiftoss/contracts'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { TronWeb } from 'tronweb'
import type { Address } from 'viem'
import { getAddress, zeroAddress } from 'viem'

import type { StepDataArgs, SwapErrorRight, SwapperName, TxBuildData } from '../../types'
import { TradeQuoteError } from '../../types'
import { makeNetworkFeeEstimationFailedErr, makeSwapErrorRight } from '../../utils'
import { getEvmNetworkFeeCryptoBaseUnit } from '../evm'
import { isNativeEvmAsset } from '../helpers'
import { getSolanaNetworkFeeCryptoBaseUnit } from '../solana'
import { getUtxoNetworkFeeCryptoBaseUnit } from '../utxo'
import { getThorRouterAndVault, getThorTxData } from './getThorTxData'
import { depositWithExpiry, swapIn } from './routerCallData/routerCalldata'
import { TradeType } from './types'

// depositWithExpiry() measured at 44k (native) / 74k (erc20) on mainnet
const SAFE_GAS_LIMIT = '100000'

// swapIn() bundles a uniswap v3 swap ahead of the deposit, measured at 206k-222k on mainnet across
// usdc/usdt/link/uni/wbtc and both the 0.05% and 0.3% pools
const SAFE_SWAP_IN_GAS_LIMIT = '250000'

type BaseArgs = {
  swapperName: SwapperName
  tradeType: TradeType
  sellAmountCryptoBaseUnit: string
  // Fully processed memo with limit and affiliate applied ('' for rates)
  memo: string
  // Raw thornode quote values, used for the evm deposit expiry and tron rate fee sizing
  expiry: number
  rawMemo: string | undefined
  // LongTailToL1: the evm deposit is built as an aggregator swapIn once the aggregator is known
  longtail?: {
    aggregator: Address
    amountOutMin: bigint
    deadline: bigint
  }
}

export type GetThorStepDataArgs = StepDataArgs<BaseArgs>

type ThorRateStepData = {
  vault: string
  router?: Address
  data?: string
  networkFeeCryptoBaseUnit: string | undefined
}

type ThorQuoteStepData = ThorRateStepData & {
  transactionData?: TxBuildData
}

export function getThorStepData(
  args: Extract<GetThorStepDataArgs, { type: 'rate' }>,
): Promise<Result<ThorRateStepData, SwapErrorRight>>
export function getThorStepData(
  args: Extract<GetThorStepDataArgs, { type: 'quote' }>,
): Promise<Result<ThorQuoteStepData, SwapErrorRight>>
export async function getThorStepData({
  type,
  input,
  from,
  deps,
  swapperName,
  tradeType,
  sellAsset,
  sellAmountCryptoBaseUnit,
  memo,
  expiry,
  rawMemo,
  longtail,
}: GetThorStepDataArgs): Promise<Result<ThorRateStepData | ThorQuoteStepData, SwapErrorRight>> {
  const { config } = deps
  const { chainNamespace } = fromAssetId(sellAsset.assetId)

  try {
    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Evm: {
        const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

        const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)

        const { router, vault } = await getThorRouterAndVault({ sellAsset, config, swapperName })

        // LongTailToL1 executes swapIn against an aggregator, every other trade type deposits directly
        const data = (() => {
          if (longtail) {
            return swapIn({
              tcRouter: THOR_ROUTER_CONTRACT_MAINNET as Address,
              tcVault: vault,
              tcMemo: memo,
              token: getAddress(fromAssetId(sellAsset.assetId).assetReference),
              amount: BigInt(sellAmountCryptoBaseUnit),
              amountOutMin: longtail.amountOutMin,
              deadline: longtail.deadline,
            })
          }

          return depositWithExpiry({
            vault,
            asset: isNativeEvmAsset(sellAsset.assetId)
              ? zeroAddress
              : getAddress(fromAssetId(sellAsset.assetId).assetReference),
            amount: BigInt(sellAmountCryptoBaseUnit),
            memo,
            expiry: BigInt(expiry),
          })
        })()

        const safeGasLimit =
          tradeType === TradeType.LongTailToL1 ? SAFE_SWAP_IN_GAS_LIMIT : SAFE_GAS_LIMIT

        if (type === 'rate') {
          const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
            adapter,
            supportsEIP1559,
            gasLimit: safeGasLimit,
          })

          return Ok({ vault, router, data, networkFeeCryptoBaseUnit })
        }

        const transactionData: TxBuildData = {
          type: 'evm',
          chainId: Number(fromChainId(sellAsset.chainId).chainReference),
          to: longtail ? longtail.aggregator : router,
          data,
          value: !longtail && isNativeEvmAsset(sellAsset.assetId) ? sellAmountCryptoBaseUnit : '0',
        }

        const networkFeeCryptoBaseUnit = await (async () => {
          try {
            // Estimates on chain and sets the estimated gas limit on the tx data
            return await getEvmNetworkFeeCryptoBaseUnit({
              adapter,
              transactionData,
              from,
              supportsEIP1559,
            })
          } catch {
            // Token deposits revert estimation before approval - fall back to the safe limit
            transactionData.gasLimit = safeGasLimit
            return getEvmNetworkFeeCryptoBaseUnit({
              adapter,
              supportsEIP1559,
              gasLimit: safeGasLimit,
            })
          }
        })()

        return Ok({ vault, router, data, transactionData, networkFeeCryptoBaseUnit })
      }
      case CHAIN_NAMESPACE.Utxo: {
        const xpub = 'xpub' in input ? input.xpub : undefined

        const adapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)

        const { vault } = await getThorTxData({ sellAsset, config, swapperName })

        const { networkFeeCryptoBaseUnit } = await getUtxoNetworkFeeCryptoBaseUnit({
          adapter,
          pubkey: xpub,
          to: vault,
          value: sellAmountCryptoBaseUnit,
          // Rates size the op_return with the raw thornode memo (processed memo is '' for rates)
          opReturnData: type === 'quote' ? memo : rawMemo,
        })

        const transactionData: TxBuildData | undefined = (() => {
          if (type === 'rate') return
          return { type: 'utxo', to: vault, opReturnData: memo, value: sellAmountCryptoBaseUnit }
        })()

        return Ok({ vault, transactionData, networkFeeCryptoBaseUnit })
      }
      case CHAIN_NAMESPACE.CosmosSdk: {
        const adapter = deps.assertGetCosmosSdkChainAdapter(sellAsset.chainId)

        const { fast } = await adapter.getFeeData({})
        const { vault } = await getThorTxData({ sellAsset, config, swapperName })

        if (type === 'rate') {
          return Ok({ vault, transactionData: undefined, networkFeeCryptoBaseUnit: fast.txFee })
        }

        if (vault) {
          // Blockchain-literal denom so consumers can construct the MsgSend amount
          const denom = (() => {
            if (sellAsset.assetId === cosmosAssetId) return 'uatom'
            if (sellAsset.assetId === thorchainAssetId) return 'rune'
            return undefined
          })()

          if (!denom) {
            return Err(
              makeSwapErrorRight({
                message: `Unsupported sellAsset: ${sellAsset.assetId}`,
                code: TradeQuoteError.UnsupportedTradePair,
              }),
            )
          }

          const transactionData: TxBuildData = {
            type: 'cosmossdk_msg_send',
            chainId: sellAsset.chainId,
            to: vault,
            denom,
            value: sellAmountCryptoBaseUnit,
            memo,
          }

          return Ok({ vault, transactionData, networkFeeCryptoBaseUnit: fast.txFee })
        }

        // Native sells (no vault) are MsgDeposits; the coin must be explicit as the thorchain
        // adapter otherwise defaults to THOR.RUNE
        const coin = (() => {
          if (sellAsset.assetId === thorchainAssetId) return 'THOR.RUNE'
          if (sellAsset.assetId === tcyAssetId) return 'THOR.TCY'
          if (sellAsset.assetId === rujiAssetId) return 'THOR.RUJI'
          if (sellAsset.assetId === mayachainAssetId) return 'MAYA.CACAO'
          return undefined
        })()

        if (!coin) {
          return Err(
            makeSwapErrorRight({
              message: `Unsupported sellAsset: ${sellAsset.assetId}`,
              code: TradeQuoteError.UnsupportedTradePair,
            }),
          )
        }

        const transactionData: TxBuildData = {
          type: 'cosmossdk_msg_deposit',
          chainId: sellAsset.chainId,
          value: sellAmountCryptoBaseUnit,
          memo,
          coin,
        }

        return Ok({ vault, transactionData, networkFeeCryptoBaseUnit: fast.txFee })
      }
      case CHAIN_NAMESPACE.Solana: {
        const adapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)
        const tokenId = contractAddressOrUndefined(sellAsset.assetId)

        const { vault } = await getThorTxData({ sellAsset, config, swapperName })

        const buildInstructions = (address: string, value: string) =>
          adapter.buildTransferInstructions({
            from: address,
            to: vault,
            tokenId,
            value,
            // Rates size the memo instruction with the raw thornode memo (processed memo is '' for rates)
            memo: type === 'quote' ? memo : rawMemo,
          })

        if (type === 'rate') {
          // Without a connected wallet the funded vault stands in as payer with a 1 lamport
          // self-transfer, simulating the same instruction shape (compute cost is amount independent)
          const address = from ?? vault
          const value = from ? sellAmountCryptoBaseUnit : '1'

          const { networkFeeCryptoBaseUnit } = await getSolanaNetworkFeeCryptoBaseUnit({
            adapter,
            from: address,
            instructions: await buildInstructions(address, value),
          })

          return Ok({ vault, networkFeeCryptoBaseUnit })
        }

        const instructions = await buildInstructions(from, sellAmountCryptoBaseUnit)

        const { networkFeeCryptoBaseUnit } = await getSolanaNetworkFeeCryptoBaseUnit({
          adapter,
          from,
          instructions,
        })

        const transactionData: TxBuildData = {
          type: 'solana',
          instructions,
          addressLookupTableAddresses: [],
        }

        return Ok({ vault, transactionData, networkFeeCryptoBaseUnit })
      }
      case CHAIN_NAMESPACE.Tron: {
        const { vault } = await getThorTxData({ sellAsset, config, swapperName })

        const networkFeeCryptoBaseUnit = await (async () => {
          // Fees are calculated for rates with a wallet connected - quotes calculate them at
          // execution via getTronTransactionFees
          if (!(type === 'rate' && input.receiveAddress && vault)) return undefined

          try {
            const contractAddress = contractAddressOrUndefined(sellAsset.assetId)

            // Estimate fees using the receive address for accurate energy calculation
            const tronWeb = new TronWeb({
              fullHost: config.VITE_TRON_NODE_URL,
              headers: config.VITE_TRON_GRID_API_KEY
                ? { 'TRON-PRO-API-KEY': config.VITE_TRON_GRID_API_KEY }
                : {},
            })
            const params = await tronWeb.trx.getChainParameters()
            const bandwidthPrice = params.find(p => p.key === 'getTransactionFee')?.value ?? 1000
            const energyPrice = params.find(p => p.key === 'getEnergyFee')?.value ?? 100

            if (contractAddress) {
              // TRC20: Estimate energy with actual recipient
              try {
                const result = await tronWeb.transactionBuilder.triggerConstantContract(
                  contractAddress,
                  'transfer(address,uint256)',
                  {},
                  [
                    { type: 'address', value: vault }, // Use vault as recipient
                    { type: 'uint256', value: sellAmountCryptoBaseUnit },
                  ],
                  input.receiveAddress, // Use user's address as sender for estimation
                )

                const energyUsed = result.energy_used ?? 65000
                const energyFee = energyUsed * energyPrice * 1.5 // 1.5x safety margin
                const bandwidthFee = 276 * bandwidthPrice // TRC20 bandwidth
                return String(Math.ceil(energyFee + bandwidthFee))
              } catch {
                // Fallback: Conservative estimate
                return String(13_000_000) // 13 TRX worst case
              }
            }

            // TRX transfer bandwidth: Base tx + memo bytes
            const baseBytes = 198
            const memoBytes = rawMemo ? Buffer.from(rawMemo, 'utf8').length : 0
            const totalBandwidth = baseBytes + memoBytes

            return String(totalBandwidth * bandwidthPrice)
          } catch {
            // Leave as undefined if estimation fails
            return undefined
          }
        })()

        return Ok({ vault, networkFeeCryptoBaseUnit })
      }
      default:
        return Err(
          makeSwapErrorRight({
            message: `Unsupported chainNamespace: ${chainNamespace}`,
            code: TradeQuoteError.UnsupportedChain,
          }),
        )
    }
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getThorStepData', error))
  }
}
