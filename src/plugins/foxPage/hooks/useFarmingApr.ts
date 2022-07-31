import { TransactionRequest } from '@ethersproject/abstract-provider'
import { BigNumber, BigNumberish } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import { Fetcher, Token } from '@uniswap/sdk'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import IUniswapV2Router02ABI from '@uniswap/v2-periphery/build/IUniswapV2Router02.json'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { selectAccountIdsByAssetId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import {
  FOX_TOKEN_CONTRACT_ADDRESS,
  UNISWAP_V2_ROUTER_ADDRESS,
  UNISWAP_V2_WETH_FOX_FARMING_REWARDS_ADDRESS,
  UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
  UNISWAP_V4_WETH_FOX_FARMING_REWARDS_ADDRESS,
  WETH_TOKEN_CONTRACT_ADDRESS,
} from '../const'
import farmingAbi from '../farmingAbi.json'
import { getEthersProvider, makeTotalLpApr, rewardRatePerToken } from '../utils'
import { useCurrentBlockNumber } from './useCurrentBlockNumber'

const ethersProvider = getEthersProvider()

function calculateSlippageMargin(percentage: number, amount: string) {
  const remainingPercentage = (100 - percentage) / 100
  return bnOrZero(toBaseUnit(amount, 18))
    .times(bnOrZero(remainingPercentage))
    .decimalPlaces(0)
    .toFixed()
}

function bufferGas(limitOrPrice: string) {
  return bnOrZero(limitOrPrice).times(1.2).decimalPlaces(0).toFixed()
}

async function getBufferedGas(tx: TransactionRequest) {
  let gasLimit = null
  let gasPrice = null
  try {
    if (ethersProvider && tx) {
      const gas = await ethersProvider?.estimateGas(tx)
      const price = await ethersProvider?.getGasPrice()
      if (gas && price) {
        gasLimit = bufferGas(gas?.toString())
        gasPrice = bufferGas(price?.toString())
      }
    }
    return {
      gasLimit,
      gasPrice,
    }
  } catch {
    throw Error('Problem estimating gas')
  }
}

const toHex = (value: BigNumberish) => BigNumber.from(value).toHexString()

const slippagePercentage = 3

export const useFarmingApr = () => {
  const [farmingAprV2, setFarmingAprV2] = useState<string | null>(null)
  const [farmingAprV4, setfarmingAprV4] = useState<string | null>(null)
  const [isFarmingAprV2Loaded, setIsFarmingAprV2Loaded] = useState(false)
  const [isFarmingAprV4Loaded, setIsFarmingAprV4Loaded] = useState(false)
  const blockNumber = useCurrentBlockNumber()

  const accountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, { assetId: 'eip155:1/slip44:60' }),
  )
  const connectWalletEthAddress = accountIds[0]

  const uniV2LiquidityContractAddress = UNISWAP_V2_WETH_FOX_POOL_ADDRESS

  const uniV2LPContract = useMemo(
    () => new Contract(uniV2LiquidityContractAddress, IUniswapV2Pair.abi, ethersProvider),
    [uniV2LiquidityContractAddress],
  )

  const farmingRewardsContractV2 = useMemo(
    () => new Contract(UNISWAP_V2_WETH_FOX_FARMING_REWARDS_ADDRESS, farmingAbi, ethersProvider),
    [],
  )
  const farmingRewardsContractV4 = useMemo(
    () => new Contract(UNISWAP_V4_WETH_FOX_FARMING_REWARDS_ADDRESS, farmingAbi, ethersProvider),
    [],
  )

  const uniswapRouterContract = useMemo(
    () => new Contract(UNISWAP_V2_ROUTER_ADDRESS, IUniswapV2Router02ABI.abi, ethersProvider),
    [],
  )

  useEffect(() => {
    if (
      !ethersProvider ||
      !Fetcher ||
      !blockNumber ||
      !uniV2LPContract ||
      !farmingRewardsContractV2 ||
      !farmingRewardsContractV4
    )
      return
    ;(async () => {
      const foxRewardRatePerTokenV2 = await rewardRatePerToken(farmingRewardsContractV2)
      const foxRewardRatePerTokenV4 = await rewardRatePerToken(farmingRewardsContractV4)

      const pair = await Fetcher.fetchPairData(
        new Token(0, WETH_TOKEN_CONTRACT_ADDRESS, 18),
        new Token(0, FOX_TOKEN_CONTRACT_ADDRESS, 18),
        ethersProvider,
      )

      const totalSupplyV2 = await uniV2LPContract.totalSupply()

      const token1PoolReservesEquivalent = bnOrZero(pair.reserve1.toFixed())
        .times(2) // Double to get equivalent of both sides of pool
        .times(`1e+${pair.token1.decimals}`) // convert to base unit value

      const foxEquivalentPerLPToken = token1PoolReservesEquivalent
        .div(bnOrZero(totalSupplyV2.toString()))
        .times(`1e+${pair.token1.decimals}`) // convert to base unit value
        .toString()

      const aprV2 = makeTotalLpApr(foxRewardRatePerTokenV2, foxEquivalentPerLPToken) // Fox Rewards per second for 1 staked LP token
      const aprV4 = makeTotalLpApr(foxRewardRatePerTokenV4, foxEquivalentPerLPToken) // Fox Rewards per second for 1 staked LP token

      setFarmingAprV2(bnOrZero(aprV2).div(100).toString())
      setfarmingAprV4(bnOrZero(aprV4).div(100).toString())
      setIsFarmingAprV2Loaded(true)
      setIsFarmingAprV4Loaded(true)
    })()
  }, [blockNumber, uniV2LPContract, farmingRewardsContractV2, farmingRewardsContractV4])

  const addLiquidity = useCallback(
    async (foxAmount: string, ethAmount: string) => {
      try {
        if (!connectWalletEthAddress || !uniswapRouterContract) return
        const data = uniswapRouterContract.interface.encodeFunctionData('addLiquidityETH', [
          FOX_TOKEN_CONTRACT_ADDRESS,
          toBaseUnit(foxAmount, 18),
          calculateSlippageMargin(slippagePercentage, foxAmount),
          calculateSlippageMargin(slippagePercentage, ethAmount),
          connectWalletEthAddress,
          Date.now() + 1200000,
        ])

        const tx = {
          from: connectWalletEthAddress,
          to: UNISWAP_V2_ROUTER_ADDRESS,
          data,
          value: toHex(toBaseUnit(ethAmount, 18)),
        }

        const { gasLimit, gasPrice } = await getBufferedGas(tx)
        if (gasLimit && gasPrice) {
          // dispatch({
          //   type: LpActions.SET_TX_FEE,
          //   payload: bn(gasLimit).times(gasPrice).toFixed()
          // })
          const ethBalance = await ethersProvider.getBalance(connectWalletEthAddress)
          if (
            bnOrZero(ethBalance.toString())
              .minus(bnOrZero(toBaseUnit(ethAmount as string, 18)))
              .lt(bnOrZero(gasLimit).times(gasPrice).toFixed())
          ) {
            throw new Error('Not enough ETH for gas')
          }

          const nonce = await ethersProvider.getSigner().getTransactionCount()
          const lpTx = await ethersProvider.getSigner().sendTransaction({
            from: connectWalletEthAddress,
            to: tx.to,
            data: tx.data,
            value: tx.value,
            gasLimit: toHex(gasLimit),
            gasPrice: toHex(gasPrice),
            nonce,
            chainId: 1,
          })
          return lpTx
        }
      } catch (error) {
        console.warn(error)
      }
    },
    [connectWalletEthAddress, uniswapRouterContract],
  )

  return { isFarmingAprV2Loaded, isFarmingAprV4Loaded, farmingAprV2, farmingAprV4, addLiquidity }
}
