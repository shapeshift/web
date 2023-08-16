import { CHAIN_REFERENCE, fromChainId } from '@shapeshiftoss/caip'
import type { osmosis } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { CosmosSignTx, Osmosis } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'
import { find } from 'lodash'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from 'lib/swapper/api'
import { osmoService } from 'lib/swapper/swappers/OsmosisSwapper/utils/osmoService'
import type {
  IbcTransferInput,
  OsmosisSupportedChainAdapter,
  PoolInfo,
  PoolRateInfo,
} from 'lib/swapper/swappers/OsmosisSwapper/utils/types'

export interface SymbolDenomMapping {
  OSMO: string
  ATOM: string
  USDC: string
}

export const symbolDenomMapping = {
  OSMO: 'uosmo',
  ATOM: 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
  USDC: 'ibc/D189335C6E4A68B513C10AB227BF1C1D38C746766278BA3EEB4FB14124F1D858',
}

type FindPoolOutput = {
  pool: PoolInfo
  sellAssetIndex: number
  buyAssetIndex: number
}

const findPool = async (
  sellAssetSymbol: string,
  buyAssetSymbol: string,
  osmoUrl: string,
): Promise<Result<FindPoolOutput, SwapErrorRight>> => {
  const sellAssetDenom = symbolDenomMapping[sellAssetSymbol as keyof SymbolDenomMapping]
  const buyAssetDenom = symbolDenomMapping[buyAssetSymbol as keyof SymbolDenomMapping]

  const poolsUrl = osmoUrl + '/lcd/osmosis/gamm/v1beta1/pools?pagination.limit=1000'

  const maybePoolsResponse = await osmoService.get(poolsUrl)

  return maybePoolsResponse.andThen<FindPoolOutput>(poolsResponse => {
    const foundPool = find(poolsResponse.data.pools, pool => {
      const token0Denom = pool.pool_assets?.[0].token.denom
      const token1Denom = pool.pool_assets?.[1].token.denom
      return (
        (token0Denom === sellAssetDenom && token1Denom === buyAssetDenom) ||
        (token0Denom === buyAssetDenom && token1Denom === sellAssetDenom)
      )
    })

    if (!foundPool)
      return Err(
        makeSwapErrorRight({ message: 'could not find pool', code: SwapErrorType.POOL_NOT_FOUND }),
      )

    const { sellAssetIndex, buyAssetIndex } = (() => {
      if (foundPool.pool_assets?.[0].token.denom === sellAssetDenom) {
        return { sellAssetIndex: 0, buyAssetIndex: 1 }
      } else {
        return { sellAssetIndex: 1, buyAssetIndex: 0 }
      }
    })()

    return Ok({ pool: foundPool, sellAssetIndex, buyAssetIndex })
  })
}

const getPoolRateInfo = (
  sellAmount: string,
  pool: PoolInfo,
  sellAssetIndex: number,
  buyAssetIndex: number,
): Result<PoolRateInfo, SwapErrorRight> => {
  const poolAssets = pool.pool_assets
  if (!poolAssets) return Err(makeSwapErrorRight({ message: 'pool assets not found' }))
  const constantProduct = bnOrZero(poolAssets[0].token.amount).times(poolAssets[1].token.amount)
  const sellAssetInitialPoolSize = bnOrZero(poolAssets[sellAssetIndex].token.amount)
  const buyAssetInitialPoolSize = bnOrZero(poolAssets[buyAssetIndex].token.amount)

  const initialMarketPrice = sellAssetInitialPoolSize.dividedBy(buyAssetInitialPoolSize)
  const sellAssetFinalPoolSize = sellAssetInitialPoolSize.plus(sellAmount)
  const buyAssetFinalPoolSize = constantProduct.dividedBy(sellAssetFinalPoolSize)
  const finalMarketPrice = sellAssetFinalPoolSize.dividedBy(buyAssetFinalPoolSize)
  const buyAmountCryptoBaseUnit = buyAssetInitialPoolSize.minus(buyAssetFinalPoolSize).toFixed(0)
  const rate = bnOrZero(buyAmountCryptoBaseUnit).dividedBy(sellAmount).toString()
  const priceImpact = bn(1).minus(initialMarketPrice.dividedBy(finalMarketPrice)).abs().toString()
  const buyAssetTradeFeeCryptoBaseUnit = bnOrZero(buyAmountCryptoBaseUnit)
    .times(bnOrZero(pool.pool_params.swap_fee))
    .toFixed(0)

  return Ok({
    rate,
    priceImpact,
    buyAssetTradeFeeCryptoBaseUnit,
    buyAmountCryptoBaseUnit,
  })
}

export const getRateInfo = async (
  sellAsset: string,
  buyAsset: string,
  sellAmount: string,
  osmoUrl: string,
): Promise<Result<PoolRateInfo, SwapErrorRight>> => {
  const sellAmountOrDefault = sellAmount === '0' ? '1' : sellAmount
  const maybePool = await findPool(sellAsset, buyAsset, osmoUrl)
  return maybePool.match({
    ok: ({ pool, sellAssetIndex, buyAssetIndex }) => {
      return getPoolRateInfo(sellAmountOrDefault, pool, sellAssetIndex, buyAssetIndex)
    },
    err: err => Err(err),
  })
}

type PerformIbcTransferInput = {
  input: IbcTransferInput
  adapter: OsmosisSupportedChainAdapter
  blockBaseUrl: string
  denom: string
  sourceChannel: string
  feeAmount: string
  accountNumber: number
  ibcAccountNumber: string
  sequence: string
  gas: string
  feeDenom: string
}

export const buildPerformIbcTransferUnsignedTx = async ({
  input,
  adapter,
  blockBaseUrl,
  denom,
  sourceChannel,
  feeAmount,
  accountNumber,
  ibcAccountNumber,
  sequence,
  gas,
  feeDenom,
}: PerformIbcTransferInput): Promise<CosmosSignTx> => {
  const { sender, receiver, amount } = input

  const responseLatestBlock = await (() => {
    try {
      return axios.get(`${blockBaseUrl}/lcd/blocks/latest`)
    } catch (e) {
      throw new SwapError('failed to get latest block', {
        code: SwapErrorType.RESPONSE_ERROR,
      })
    }
  })()
  const latestBlock = responseLatestBlock.data.block.header.height

  const tx: Osmosis.StdTx = {
    memo: '',
    fee: {
      amount: [
        {
          amount: feeAmount.toString(),
          denom: feeDenom,
        },
      ],
      gas,
    },
    signatures: [],
    msg: [
      {
        type: 'cosmos-sdk/MsgTransfer',
        value: {
          source_port: 'transfer',
          source_channel: sourceChannel,
          token: {
            denom,
            amount,
          },
          sender,
          receiver,
          timeout_height: {
            revision_number: '4',
            revision_height: String(Number(latestBlock) + 100),
          },
        },
      },
    ],
  }

  const bip44Params = adapter.getBIP44Params({ accountNumber })

  return {
    tx,
    addressNList: toAddressNList(bip44Params),
    chain_id: fromChainId(adapter.getChainId()).chainReference,
    account_number: ibcAccountNumber,
    sequence,
  }
}

type BuildTradeTxInput = {
  osmoAddress: string
  adapter: osmosis.ChainAdapter
  accountNumber: number
  buyAssetDenom: string
  sellAssetDenom: string
  sellAmount: string
  gas: string
  feeAmount: string
  feeDenom: string
}

export const buildSwapExactAmountInTx = async ({
  osmoAddress,
  adapter,
  accountNumber,
  buyAssetDenom,
  sellAssetDenom,
  sellAmount,
  gas,
  feeAmount,
  feeDenom,
}: BuildTradeTxInput): Promise<CosmosSignTx> => {
  const responseAccount = await adapter.getAccount(osmoAddress)

  // note - this is a cosmos sdk specific account_number, not a bip44Params accountNumber
  const account_number = responseAccount.chainSpecific.accountNumber || '0'
  const sequence = responseAccount.chainSpecific.sequence || '0'

  const tx: Osmosis.StdTx = {
    memo: '',
    fee: {
      amount: [
        {
          amount: feeAmount,
          denom: feeDenom,
        },
      ],
      gas,
    },
    signatures: [],
    msg: [
      {
        type: 'osmosis/gamm/swap-exact-amount-in',
        value: {
          sender: osmoAddress,
          routes: [
            {
              pool_id: '1', // TODO: should probably get this from the util pool call
              token_out_denom: buyAssetDenom,
            },
          ],
          token_in: {
            denom: sellAssetDenom,
            amount: sellAmount,
          },
          token_out_min_amount: '1', // slippage tolerance
        },
      },
    ],
  }

  const bip44Params = adapter.getBIP44Params({ accountNumber })

  return {
    tx,
    addressNList: toAddressNList(bip44Params),
    chain_id: CHAIN_REFERENCE.OsmosisMainnet,
    account_number,
    sequence,
  }
}
