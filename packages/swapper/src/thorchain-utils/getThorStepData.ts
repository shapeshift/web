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
import type { Asset } from '@shapeshiftoss/types'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { TronWeb } from 'tronweb'
import type { Address } from 'viem'
import { getAddress, zeroAddress } from 'viem'

import { getEvmNetworkFeeCryptoBaseUnit } from '../evm-utils'
import { isNativeEvmAsset } from '../swappers/utils/helpers/helpers'
import type {
  CommonTradeQuoteInput,
  GetEvmTradeQuoteInput,
  GetEvmTradeRateInput,
  GetTradeRateInput,
  GetUtxoTradeRateInput,
  QuoteFeeData,
  SwapperDeps,
  SwapperName,
  TradeQuoteStep,
  TxBuildData,
} from '../types'
import { getUtxoNetworkFeeCryptoBaseUnit } from '../utxo-utils'
import { getThorRouterAndVault, getThorTxData } from './getThorTxData'
import { depositWithExpiry, swapIn } from './routerCallData/routerCalldata'
import { TradeType } from './types'

// depositWithExpiry() measured at 44k (native) / 74k (erc20) on mainnet
const SAFE_GAS_LIMIT = '100000'

// swapIn() bundles a uniswap v3 swap ahead of the deposit, measured at 206k-222k on mainnet across
// usdc/usdt/link/uni/wbtc and both the 0.05% and 0.3% pools
const SAFE_SWAP_IN_GAS_LIMIT = '250000'

const SOLANA_MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'

type BaseArgs = {
  deps: SwapperDeps
  swapperName: SwapperName
  tradeType: TradeType
  sellAsset: Asset
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

type QuoteArgs = BaseArgs & { type: 'quote'; input: CommonTradeQuoteInput; from: string }
type RateArgs = BaseArgs & { type: 'rate'; input: GetTradeRateInput; from?: undefined }

type GetThorStepDataArgs = QuoteArgs | RateArgs

type GetThorStepDataReturn = {
  vault: string
  router?: Address
  data?: string
  transactionData?: TxBuildData
  networkFeeCryptoBaseUnit: string | undefined
  chainSpecific?: QuoteFeeData['chainSpecific']
  thorchainTransactionMetadata?: TradeQuoteStep['thorchainTransactionMetadata']
}

export const getThorStepData = async ({
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
}: GetThorStepDataArgs): Promise<GetThorStepDataReturn> => {
  const { config } = deps
  const { chainNamespace } = fromAssetId(sellAsset.assetId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      const { supportsEIP1559 } = input as GetEvmTradeRateInput | GetEvmTradeQuoteInput

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

        return { vault, router, data, networkFeeCryptoBaseUnit }
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

      return { vault, router, data, transactionData, networkFeeCryptoBaseUnit }
    }
    case CHAIN_NAMESPACE.Utxo: {
      const { xpub } = input as GetUtxoTradeRateInput

      const adapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)

      const { vault } = await getThorTxData({ sellAsset, config, swapperName })

      const { networkFeeCryptoBaseUnit, satsPerByte } = await getUtxoNetworkFeeCryptoBaseUnit({
        adapter,
        pubkey: xpub,
        to: vault,
        value: sellAmountCryptoBaseUnit,
        opReturnData: memo,
      })

      const transactionData: TxBuildData | undefined = (() => {
        if (type === 'rate') return
        return { type: 'utxo', to: vault, opReturnData: memo, value: sellAmountCryptoBaseUnit }
      })()

      return {
        vault,
        transactionData,
        networkFeeCryptoBaseUnit,
        chainSpecific: { satsPerByte },
        thorchainTransactionMetadata: { to: vault, memo, value: sellAmountCryptoBaseUnit },
      }
    }
    case CHAIN_NAMESPACE.CosmosSdk: {
      const adapter = deps.assertGetCosmosSdkChainAdapter(sellAsset.chainId)

      const { fast } = await adapter.getFeeData({})
      const { vault } = await getThorTxData({ sellAsset, config, swapperName })

      const transactionData: TxBuildData | undefined = (() => {
        if (type === 'rate') return

        if (vault) {
          // Blockchain-literal denom so consumers can construct the MsgSend amount
          const denom = (() => {
            if (sellAsset.assetId === cosmosAssetId) return 'uatom'
            if (sellAsset.assetId === thorchainAssetId) return 'rune'
            throw new Error(`Unsupported sellAsset: ${sellAsset.assetId}`)
          })()

          return {
            type: 'cosmossdk_msg_send',
            chainId: sellAsset.chainId,
            to: vault,
            denom,
            value: sellAmountCryptoBaseUnit,
            memo,
          }
        }

        // Native sells (no vault) are MsgDeposits; the coin must be explicit as the thorchain
        // adapter otherwise defaults to THOR.RUNE
        const coin = (() => {
          if (sellAsset.assetId === thorchainAssetId) return 'THOR.RUNE'
          if (sellAsset.assetId === tcyAssetId) return 'THOR.TCY'
          if (sellAsset.assetId === rujiAssetId) return 'THOR.RUJI'
          if (sellAsset.assetId === mayachainAssetId) return 'MAYA.CACAO'
          throw new Error(`Unsupported sellAsset: ${sellAsset.assetId}`)
        })()

        return {
          type: 'cosmossdk_msg_deposit',
          chainId: sellAsset.chainId,
          value: sellAmountCryptoBaseUnit,
          memo,
          coin,
        }
      })()

      return {
        vault,
        transactionData,
        networkFeeCryptoBaseUnit: fast.txFee,
        chainSpecific: { estimatedGasCryptoBaseUnit: fast.chainSpecific.gasLimit },
        thorchainTransactionMetadata: { to: vault, memo, value: sellAmountCryptoBaseUnit },
      }
    }
    case CHAIN_NAMESPACE.Solana: {
      const adapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)
      const sendAddress = (input as CommonTradeQuoteInput).sendAddress

      const { vault } = await getThorTxData({ sellAsset, config, swapperName })

      const networkFeeCryptoBaseUnit = await (async () => {
        if (!sendAddress) return undefined

        const memoInstruction = new TransactionInstruction({
          keys: [],
          programId: new PublicKey(SOLANA_MEMO_PROGRAM_ID),
          data: Buffer.from(memo, 'utf8'),
        })
        const transferInstruction = SystemProgram.transfer({
          fromPubkey: new PublicKey(sendAddress),
          toPubkey: new PublicKey(vault),
          lamports: BigInt(sellAmountCryptoBaseUnit),
        })
        const { fast } = await adapter.getFeeData({
          to: vault,
          value: '0',
          chainSpecific: {
            from: sendAddress,
            tokenId: contractAddressOrUndefined(sellAsset.assetId),
            instructions: [memoInstruction, transferInstruction],
          },
        })

        return fast.txFee
      })()

      return {
        vault,
        networkFeeCryptoBaseUnit,
        thorchainTransactionMetadata: { to: vault, memo, value: sellAmountCryptoBaseUnit },
      }
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

      return {
        vault,
        networkFeeCryptoBaseUnit,
        thorchainTransactionMetadata: { to: vault, memo, value: sellAmountCryptoBaseUnit },
      }
    }
    default:
      throw new Error(`Unsupported chainNamespace: ${chainNamespace}`)
  }
}
