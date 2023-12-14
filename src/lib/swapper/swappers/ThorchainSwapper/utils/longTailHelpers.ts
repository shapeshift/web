import { avalancheChainId, bscChainId, ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { Token } from '@uniswap/sdk-core'
import { computePoolAddress, FeeAmount } from '@uniswap/v3-sdk'
import { type Address, getContract, type PublicClient } from 'viem'

import { IUniswapV3PoolABI } from '../getThorTradeQuote/abis/IUniswapV3PoolAbi'
import { QuoterAbi } from '../getThorTradeQuote/abis/QuoterAbi'
import type { ThornodePoolResponse } from '../types'
import { WAVAX_TOKEN, WBNB_TOKEN, WETH_TOKEN } from './constants'

export const getWrappedToken = (nativeAsset: Asset): Token => {
  switch (nativeAsset.chainId) {
    case ethChainId:
      return WETH_TOKEN
    case bscChainId:
      return WBNB_TOKEN
    case avalancheChainId:
      return WAVAX_TOKEN
    default:
      throw new Error(`getWrappedToken: Unsupported chainId ${nativeAsset.chainId}`)
  }
}

export const getTokenFromAsset = (asset: Asset): Token => {
  const { symbol, name, precision, assetId } = asset
  const { chainReference: chainReferenceStr, assetReference } = fromAssetId(assetId)
  const chainReference = Number(chainReferenceStr)
  return new Token(chainReference, assetReference, precision, symbol, name)
}

export enum TradeType {
  LongTailToLongTail = 'LongTailToLongTail',
  LongTailToL1 = 'LongTailToL1',
  L1ToLongTail = 'L1ToLongTail',
  L1ToL1 = 'L1ToL1',
}

export function getTradeType(
  sellAssetPool: ThornodePoolResponse | undefined,
  buyAssetPool: ThornodePoolResponse | undefined,
  sellPoolId: string | undefined,
  buyPoolId: string | undefined,
): TradeType | undefined {
  switch (true) {
    case !!sellAssetPool && !!buyAssetPool:
    case !!buyAssetPool && !sellAssetPool && sellPoolId === 'THOR.RUNE':
    case !!sellAssetPool && !buyAssetPool && buyPoolId === 'THOR.RUNE':
      return TradeType.L1ToL1
    case !sellAssetPool && !buyAssetPool:
      return TradeType.LongTailToLongTail
    case !sellAssetPool && !!buyAssetPool:
      return TradeType.LongTailToL1
    case !!sellAssetPool && !buyAssetPool:
      return TradeType.L1ToLongTail
    default:
      return undefined
  }
}

// TODO: we need to fetch these contracts dynamically, as the whitelist can change
export enum AggregatorContract {
  TSAggregatorUniswapV3_100 = '0xbd68cbe6c247e2c3a0e36b8f0e24964914f26ee8',
  TSAggregatorUniswapV3_500 = '0xe4ddca21881bac219af7f217703db0475d2a9f02',
  TSAggregatorUniswapV3_3000 = '0x11733abf0cdb43298f7e949c930188451a9a9ef2',
  TSAggregatorUniswapV3_10000 = '0xb33874810e5395eb49d8bd7e912631db115d5a03',
}

export const contractToFeeAmountMap: Record<AggregatorContract, FeeAmount> = {
  [AggregatorContract.TSAggregatorUniswapV3_100]: FeeAmount.LOWEST,
  [AggregatorContract.TSAggregatorUniswapV3_500]: FeeAmount.LOW,
  [AggregatorContract.TSAggregatorUniswapV3_3000]: FeeAmount.MEDIUM,
  [AggregatorContract.TSAggregatorUniswapV3_10000]: FeeAmount.HIGH,
}

export const generateV3PoolAddressesAcrossFeeRange = (
  factoryAddress: string,
  tokenA: Token,
  tokenB: Token,
): Map<Address, FeeAmount> => {
  const poolAddresses = new Map<Address, FeeAmount>()
  Object.values(FeeAmount)
    .filter((value): value is FeeAmount => typeof value === 'number')
    .forEach((fee: FeeAmount) => {
      const poolAddress = computePoolAddress({
        factoryAddress,
        tokenA,
        tokenB,
        fee,
      })
      poolAddresses.set(poolAddress as Address, fee as FeeAmount)
    })
  return poolAddresses
}

type ContractData = {
  fee: FeeAmount
  tokenIn: Address
  tokenOut: Address
}

export const getPoolContractData = (
  poolAddresses: Map<Address, FeeAmount>,
  publicClient: PublicClient,
  tokenAAddress: string,
  tokenBAddress: string,
): Map<Address, ContractData> => {
  const poolContracts = new Map<Address, ContractData>()
  poolAddresses.forEach(async (feeAmount, address) => {
    const poolContract = getContract({
      abi: IUniswapV3PoolABI,
      address,
      publicClient,
    })
    const [token0, token1]: [Address, Address] = await Promise.all([
      poolContract.read.token0(),
      poolContract.read.token1(),
    ])

    const tokenIn = token0 === tokenAAddress ? token0 : token1
    const tokenOut = token1 === tokenBAddress ? token1 : token0

    poolContracts.set(poolContract.address, { fee: feeAmount, tokenIn, tokenOut })
  })
  return poolContracts
}

export const getQuotedAmountOuts = (
  poolContracts: Map<Address, ContractData>,
  sellAmount: bigint,
  publicClient: PublicClient,
): Promise<Map<Address, bigint>> => {
  const QUOTER_CONTRACT_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6' // FIXME: this is only true for Ethereum
  const quoterContract = getContract({
    abi: QuoterAbi,
    address: QUOTER_CONTRACT_ADDRESS as Address,
    publicClient,
  })

  return Promise.all(
    Array.from(poolContracts.entries()).map(async ([poolContract, data]) => {
      const { fee, tokenIn, tokenOut } = data
      const quotedAmountOut = await quoterContract.simulate
        .quoteExactInputSingle([tokenIn, tokenOut, fee, sellAmount, BigInt(0)])
        .then(res => res.result)

      return [poolContract, quotedAmountOut] as [Address, bigint]
    }),
  ).then(results => new Map(results))
}

export const selectBestRate = (
  quotedAmounts: Map<Address, bigint>,
): [Address, bigint] | undefined => {
  return Array.from(quotedAmounts.entries()).reduce(
    (
      addressWithHighestAmount: [Address, bigint] | undefined,
      [address, amount]: [Address, bigint],
    ) => {
      return amount > (addressWithHighestAmount?.[1] ?? BigInt(0))
        ? [address, amount]
        : addressWithHighestAmount
    },
    undefined,
  )
}
