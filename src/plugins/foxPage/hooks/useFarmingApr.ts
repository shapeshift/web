import { Contract } from '@ethersproject/contracts'
import {
  ChainAdapter,
  ethereum,
  EvmBaseAdapter,
  EvmChainId,
  FeeData,
} from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import { Fetcher, Token } from '@uniswap/sdk'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import IUniswapV2Router02ABI from '@uniswap/v2-periphery/build/IUniswapV2Router02.json'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectFirstAccountSpecifierByChainId } from 'state/slices/selectors'
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
function calculateSlippageMargin(amount: string | null) {
  if (!amount) throw new Error('Amount not given for slippage')
  const percentage = 3
  const remainingPercentage = (100 - percentage) / 100
  return bnOrZero(amount).times(bnOrZero(remainingPercentage)).decimalPlaces(0).toFixed()
}

export const useFarmingApr = () => {
  const [farmingAprV2, setFarmingAprV2] = useState<string | null>(null)
  const [farmingAprV4, setfarmingAprV4] = useState<string | null>(null)
  const [isFarmingAprV2Loaded, setIsFarmingAprV2Loaded] = useState(false)
  const [isFarmingAprV4Loaded, setIsFarmingAprV4Loaded] = useState(false)
  const blockNumber = useCurrentBlockNumber()
  const { supportedEvmChainIds } = useEvm()
  const ethAsset = useAppSelector(state => selectAssetById(state, 'eip155:1/slip44:60'))
  const {
    state: { wallet },
  } = useWallet()

  const connectedWalletEthAddress = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, ethAsset.chainId),
  )

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
        if (!connectedWalletEthAddress || !uniswapRouterContract || !wallet) return
        const chainAdapterManager = getChainAdapterManager()
        try {
          const adapter = chainAdapterManager.get(ethAsset.chainId) as ChainAdapter<KnownChainIds>
          if (!adapter)
            throw new Error(`addLiquidityEth: no adapter available for ${ethAsset.chainId}`)
          const value = bnOrZero(ethAmount)
            .times(bnOrZero(10).exponentiatedBy(ethAsset.precision))
            .toFixed(0)
          const data = uniswapRouterContract?.interface.encodeFunctionData('addLiquidityETH', [
            FOX_TOKEN_CONTRACT_ADDRESS,
            foxAmount,
            calculateSlippageMargin(foxAmount),
            calculateSlippageMargin(ethAmount),
            connectedWalletEthAddress,
            Date.now() + 1200000,
          ])
          const adapterType = adapter.getChainId()
          const estimatedFees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData(
            {
              to: UNISWAP_V2_ROUTER_ADDRESS,
              value,
              chainSpecific: {
                contractData: data,
                from: connectedWalletEthAddress,
                contractAddress: FOX_TOKEN_CONTRACT_ADDRESS,
              },
            },
          )
          const result = await (async () => {
            if (supportedEvmChainIds.includes(adapterType)) {
              if (!supportsETH(wallet))
                throw new Error(`addLiquidityEthFox: wallet does not support ethereum`)
              const fees = estimatedFees.average as FeeData<EvmChainId>
              const {
                chainSpecific: { gasPrice, gasLimit, maxFeePerGas, maxPriorityFeePerGas },
              } = fees
              const shouldUseEIP1559Fees =
                (await wallet.ethSupportsEIP1559()) &&
                maxFeePerGas !== undefined &&
                maxPriorityFeePerGas !== undefined
              if (!shouldUseEIP1559Fees && gasPrice === undefined) {
                throw new Error(`addLiquidityEthFox: missing gasPrice for non-EIP-1559 tx`)
              }
              return await (adapter as unknown as ethereum.ChainAdapter).buildSendTransaction({
                to: UNISWAP_V2_ROUTER_ADDRESS,
                value,
                wallet,
                chainSpecific: {
                  contractData: data,
                  erc20ContractAddress: FOX_TOKEN_CONTRACT_ADDRESS,
                  gasLimit,
                  ...(shouldUseEIP1559Fees ? { maxFeePerGas, maxPriorityFeePerGas } : { gasPrice }),
                },
              })
            } else {
              throw new Error(`addLiquidityEthFox: wallet does not support ethereum`)
            }
          })()
          const txToSign = result.txToSign

          const broadcastTXID = await (async () => {
            if (wallet.supportsOfflineSigning()) {
              const signedTx = await adapter.signTransaction({
                txToSign,
                wallet,
              })
              return adapter.broadcastTransaction(signedTx)
            } else if (wallet.supportsBroadcast()) {
              /**
               * signAndBroadcastTransaction is an optional method on the HDWallet interface.
               * Check and see if it exists; if so, call and make sure a txhash is returned
               */
              if (!adapter.signAndBroadcastTransaction) {
                throw new Error('signAndBroadcastTransaction undefined for wallet')
              }
              return adapter.signAndBroadcastTransaction?.({ txToSign, wallet })
            } else {
              throw new Error('Bad hdwallet config')
            }
          })()

          if (!broadcastTXID) {
            throw new Error('Broadcast failed')
          }
        } catch (e) {}
      } catch (error) {
        console.warn(error)
      }
    },
    [
      connectedWalletEthAddress,
      ethAsset.chainId,
      ethAsset.precision,
      supportedEvmChainIds,
      uniswapRouterContract,
      wallet,
    ],
  )

  return { isFarmingAprV2Loaded, isFarmingAprV4Loaded, farmingAprV2, farmingAprV4, addLiquidity }
}
