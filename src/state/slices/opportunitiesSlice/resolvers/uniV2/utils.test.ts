import type { I_UNISWAP_V2_PAIR_ABI } from '@shapeshiftoss/contracts'
import { viemEthMainnetClient } from '@shapeshiftoss/contracts'
import { Token, TokenAmount } from '@uniswap/sdk'
import BigNumber from 'bignumber.js'
import type { Address, GetContractReturnType, PublicClient } from 'viem'
import { getContract } from 'viem'
import { describe, expect, it, vi } from 'vitest'

import { TRADING_FEE_RATE } from '@/state/slices/opportunitiesSlice/resolvers/uniV2/constants'
import {
  calculateAPRFromToken0,
  getToken0Volume24Hr,
} from '@/state/slices/opportunitiesSlice/resolvers/uniV2/utils'

const tokenAmount = '1000000'
const mockAmount0Out = '97000000000000000000000'
const mockAmount0In = '23000000000000000000000'
const blockNumber = 5000000

vi.mock('@shapeshiftoss/contracts', async () => {
  const { KnownChainIds } = await import('@shapeshiftoss/types')

  const actual = await vi.importActual('@shapeshiftoss/contracts')

  const viemEthMainnetClient = {
    createEventFilter: vi.fn(() => ({})),
    getLogs: () =>
      new Promise(resolve => {
        resolve([
          {
            args: {
              amount0Out: mockAmount0Out,
              amount1In: '100000000000000000000',
            },
          },
          {
            args: {
              amount0In: mockAmount0In,
              amount1Out: '223100000000000000000',
            },
          },
        ])
      }),
  }
  return {
    ...actual,
    viemEthMainnetClient,
    viemClientByChainId: {
      [KnownChainIds.EthereumMainnet]: viemEthMainnetClient,
    },
  }
})

const mockContract = getContract({
  abi: [],
  address: '' as Address,
  client: viemEthMainnetClient,
}) as unknown as GetContractReturnType<typeof I_UNISWAP_V2_PAIR_ABI, PublicClient>
const token0Decimals = 18
const mockToken0Reserves = new TokenAmount(
  new Token(1, '0x0000000000000000000000000000000000000000', token0Decimals),
  tokenAmount,
)

describe('resolvers/univ2/utils', () => {
  it('should calculate correct token0Volume24hr', async () => {
    const expectedVolume = new BigNumber(mockAmount0In)
      .plus(new BigNumber(mockAmount0Out).div(1 - TRADING_FEE_RATE).decimalPlaces(0))
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

    const totalDailyVolume = new BigNumber(mockAmount0In).plus(
      new BigNumber(mockAmount0Out).div(1 - TRADING_FEE_RATE).decimalPlaces(0),
    )

    const totalAnnualVolume = totalDailyVolume.times(365.25)
    const totalAnnualRewards = totalAnnualVolume.times(TRADING_FEE_RATE).decimalPlaces(0)
    const token0ReservesBaseUnitValue = new BigNumber(tokenAmount)
    const totalLPLiquidityBaseUnitValue = token0ReservesBaseUnitValue.times(2)
    const annualRewardFraction = totalAnnualRewards.div(totalLPLiquidityBaseUnitValue)
    const annualPercentageRewards = annualRewardFraction.times(100).decimalPlaces(4).toString()

    const apr = await calculateAPRFromToken0(input)
    expect(apr).toEqual(annualPercentageRewards)
  })
})
