import { avalancheChainId, bscChainId, ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import type { UNISWAP_V3_QUOTER_ABI } from '@shapeshiftoss/contracts'
import { I_UNISWAP_V3_POOL_ABI } from '@shapeshiftoss/contracts'
import type { Asset } from '@shapeshiftoss/types'
import { Token } from '@uniswap/sdk-core'
import { computePoolAddress, FeeAmount } from '@uniswap/v3-sdk'
import type {
  type Address,
  getAddress,
  getContract,
  GetContractReturnType,
  type PublicClient,
} from 'viem'

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
    case sellPoolId === 'THOR.RUNE' && !buyAssetPool:
      return TradeType.L1ToLongTail
    case !!sellAssetPool && !buyAssetPool:
      return TradeType.L1ToLongTail
    case !sellAssetPool && !buyAssetPool:
      return TradeType.LongTailToLongTail
    case !sellAssetPool && !!buyAssetPool:
      return TradeType.LongTailToL1
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

export const feeAmountToContractMap: Record<FeeAmount, AggregatorContract> = Object.entries(
  contractToFeeAmountMap,
).reduce(
  (acc, [key, value]) => ({ ...acc, [value]: key }),
  {} as Record<FeeAmount, AggregatorContract>,
)

export const generateV3PoolAddressesAcrossFeeRange = (
  factoryAddress: string,
  tokenA: Token,
  tokenB: Token,
): Map<Address, { token0Address: Address; token1Address: Address; fee: FeeAmount }> => {
  const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]
  const poolAddresses = new Map<
    Address,
    { token0Address: Address; token1Address: Address; fee: FeeAmount }
  >()
  Object.values(FeeAmount)
    .filter((value): value is FeeAmount => typeof value === 'number')
    .forEach((fee: FeeAmount) => {
      const poolAddress = computePoolAddress({
        factoryAddress,
        tokenA,
        tokenB,
        fee,
      })
      poolAddresses.set(getAddress(poolAddress), {
        fee: fee as FeeAmount,
        token0Address: getAddress(token0.address),
        token1Address: getAddress(token1.address),
      })
    })
  return poolAddresses
}

type ContractData = {
  fee: FeeAmount
  tokenIn: Address
  tokenOut: Address
}

export const getContractDataByPool = (
  poolAddresses: Map<Address, { token0Address: Address; token1Address: Address; fee: FeeAmount }>,
  publicClient: PublicClient,
  tokenAAddress: string,
  tokenBAddress: string,
): Map<Address, ContractData> => {
  const poolContracts = new Map<Address, ContractData>()
  Array.from(poolAddresses.entries()).forEach(
    ([address, { fee, token0Address, token1Address }]) => {
      const poolContract = getContract({
        abi: I_UNISWAP_V3_POOL_ABI,
        address,
        client: publicClient,
      })
      const tokenIn = token0Address === tokenAAddress ? token0Address : token1Address
      const tokenOut = token1Address === tokenBAddress ? token1Address : token0Address
      try {
        poolContracts.set(poolContract.address, { fee, tokenIn, tokenOut })
      } catch {
        // The pool contract is not supported, that's ok - skip it without logging an error
        return
      }
    },
  )

  return poolContracts
}

export const getQuotedAmountOutByPool = async (
  poolContracts: Map<Address, ContractData>,
  sellAmount: bigint,
  quoterContract: GetContractReturnType<typeof UNISWAP_V3_QUOTER_ABI, PublicClient, Address>,
): Promise<Map<Address, bigint>> => {
  const results = await Promise.allSettled(
    Array.from(poolContracts.entries()).map(async ([poolContract, data]) => {
      const { fee, tokenIn, tokenOut } = data
      try {
        const params = [tokenIn, tokenOut, fee, sellAmount, BigInt(0)] as const
        const { result: quotedAmountOut } =
          await quoterContract.simulate.quoteExactInputSingle(params)
        return [poolContract, quotedAmountOut] as [Address, bigint]
      } catch {
        // The pool contract is not supported, that's ok - skip it without logging an error
        return undefined
      }
    }),
  )

  return new Map(
    results.reduce<[Address, bigint][]>((prev, result) => {
      if (result.status !== 'fulfilled' || !result.value) return prev
      return [...prev, result.value]
    }, []),
  )
}

export const selectBestRate = (
  quotedAmounts: Map<Address, bigint>,
): [Address | undefined, bigint | undefined] => {
  return Array.from(quotedAmounts.entries()).reduce(
    (
      addressWithHighestAmount: [Address | undefined, bigint | undefined],
      [poolAddress, amount]: [Address, bigint],
    ) => {
      if (addressWithHighestAmount[1] === undefined) return [poolAddress, amount]
      return amount > addressWithHighestAmount[1] ? [poolAddress, amount] : addressWithHighestAmount
    },
    [undefined, undefined],
  )
}

export const shortenedNativeAssetNameByNativeAssetName = {
  'THOR.RUNE': 'r',
  'BTC.BTC': 'b',
  'ETH.ETH': 'e',
  'BNB.BNB': 'n',
  'GAIA.ATOM': 'g',
  'DOGE.DOGE': 'd',
  'LTC.LTC': 'l',
  'BCH.BCH': 'c',
  'AVAX.AVAX': 'a',
  'BSC.BNB': 's',
} as const
