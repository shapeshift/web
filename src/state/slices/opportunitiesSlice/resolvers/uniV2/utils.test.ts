import { Contract } from '@ethersproject/contracts'
import { Token, TokenAmount } from '@uniswap/sdk'
import BigNumber from 'bignumber.js'
import type { IUniswapV2Pair } from 'contracts/__generated'
import { TRADING_FEE_RATE } from 'state/slices/opportunitiesSlice/resolvers/uniV2/constants'
import {
  calculateAPRFromToken0,
  getToken0Volume24Hr,
} from 'state/slices/opportunitiesSlice/resolvers/uniV2/utils'

jest.mock('contracts/contractManager', () => ({
  getOrCreateContractByAddress: () => ({
    filters: {
      Swap: jest.fn(() => {}),
    },
    queryFilter: mockGetPastEvents,
  }),
  getOrCreateContractByType: () => ({
    filters: {
      Swap: jest.fn(() => {}),
    },
    queryFilter: mockGetPastEvents,
  }),
}))

jest.mock('@ethersproject/contracts', () => ({
  Contract: jest.fn().mockImplementation(() => ({
    filters: {
      Swap: jest.fn(() => {}),
    },
    queryFilter: mockGetPastEvents,
  })),
}))
jest.mock('@uniswap/sdk', () => ({
  Token: jest.fn().mockImplementation(),
  TokenAmount: jest.fn().mockImplementation(() => ({
    toFixed: () => tokenAmount,
  })),
}))

const tokenAmount = '1000000'
const amount0Out = '97000000000000000000000'
const amount0In = '23000000000000000000000'
const blockNumber = 5000000

const mockGetPastEvents = () =>
  new Promise(resolve => {
    resolve([
      {
        args: {
          amount0Out,
          amount1In: '100000000000000000000',
        },
      },
      {
        args: {
          amount0In,
          amount1Out: '223100000000000000000',
        },
      },
    ])
  })

const mockContract = new Contract('', '') as IUniswapV2Pair
const token0Decimals = 18
const mockToken0Reserves = new TokenAmount(new Token(1, '', token0Decimals), tokenAmount)

describe('resolvers/univ2/utils', () => {
  it('should calculate correct token0Volume24hr', async () => {
    const expectedVolume = new BigNumber(amount0In)
      .plus(new BigNumber(amount0Out).div(1 - TRADING_FEE_RATE).decimalPlaces(0))
      .valueOf()

    const dailyVolume = await getToken0Volume24Hr({
      blockNumber,
      uniswapLPContract: mockContract,
    })
    expect(dailyVolume).toEqual(expectedVolume)
  })
  it('should calculate correct APR from given reserves', async () => {
    const input = {
      blockNumber,
      pairAssetId: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
      token0Decimals,
      token0Reserves: mockToken0Reserves,
    }

    const totalDailyVolume = new BigNumber(amount0In).plus(
      new BigNumber(amount0Out).div(1 - TRADING_FEE_RATE).decimalPlaces(0),
    )

    const totalAnnualVolume = totalDailyVolume.times(365.25)
    const totalAnnualRewards = totalAnnualVolume.times(TRADING_FEE_RATE).decimalPlaces(0)
    const token0ReservesBaseUnitValue = new BigNumber(tokenAmount).times(`1e+${token0Decimals}`)
    const totalLPLiquidityBaseUnitValue = token0ReservesBaseUnitValue.times(2)
    const annualRewardFraction = totalAnnualRewards.div(totalLPLiquidityBaseUnitValue)
    const annualPercentageRewards = annualRewardFraction.times(100).decimalPlaces(4).toString()

    const apr = await calculateAPRFromToken0(input)
    expect(apr).toEqual(annualPercentageRewards)
  })
})
