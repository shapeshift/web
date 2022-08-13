import { Contract } from '@ethersproject/contracts'
import { ethAssetId } from '@shapeshiftoss/caip'
import {
  ChainAdapter,
  ethereum,
  EvmBaseAdapter,
  EvmChainId,
  FeeData,
} from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { getEthersProvider } from 'plugins/foxPage/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import {
  foxEthLpAssetId,
  MAX_ALLOWANCE,
  UNISWAP_V2_ROUTER_ADDRESS,
  UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
} from '../../fox-eth-lp/constants'
import { useFoxEthLiquidityPool } from '../../fox-eth-lp/hooks/useFoxEthLiquidityPool'
import farmAbi from '../abis/farmingAbi.json'
import IUniswapV2Router02ABI from '../abis/IUniswapV2Router02.json'
import { FOX_FARMING_CONTRACT_ADDRESS } from '../constants'

const ethersProvider = getEthersProvider()

export const useFoxFarming = () => {
  const [connectedWalletEthAddress, setConnectedWalletEthAddress] = useState<string | null>(null)
  const { supportedEvmChainIds } = useEvm()
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const lpAsset = useAppSelector(state => selectAssetById(state, foxEthLpAssetId))
  const {
    state: { wallet },
  } = useWallet()
  const { getLpTokenPrice } = useFoxEthLiquidityPool()

  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(ethAsset.chainId) as ChainAdapter<KnownChainIds>

  useEffect(() => {
    if (wallet && adapter) {
      ;(async () => {
        const address = await adapter.getAddress({ wallet })
        setConnectedWalletEthAddress(address)
      })()
    }
  }, [adapter, wallet])

  const uniswapRouterContract = useMemo(
    () => new Contract(UNISWAP_V2_ROUTER_ADDRESS, IUniswapV2Router02ABI.abi, ethersProvider),
    [],
  )

  // const foxContract = useMemo(
  //   () => new Contract(FOX_TOKEN_CONTRACT_ADDRESS, erc20abi, ethersProvider),
  //   [],
  // )

  const foxFarmingContract = useMemo(
    () => new Contract(FOX_FARMING_CONTRACT_ADDRESS, farmAbi, ethersProvider),
    [],
  )

  const uniV2LPContract = useMemo(
    () => new Contract(UNISWAP_V2_WETH_FOX_POOL_ADDRESS, IUniswapV2Pair.abi, ethersProvider),
    [],
  )

  const stake = useCallback(
    async (lpAmount: string) => {
      try {
        if (!connectedWalletEthAddress || !foxFarmingContract || !wallet) return
        if (!adapter)
          throw new Error(`addLiquidityEth: no adapter available for ${ethAsset.chainId}`)
        const data = foxFarmingContract.interface.encodeFunctionData('stake', [
          bnOrZero(lpAmount).times(bnOrZero(10).exponentiatedBy(lpAsset.precision)).toFixed(0),
        ])
        const adapterType = adapter.getChainId()
        const estimatedFees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
          to: FOX_FARMING_CONTRACT_ADDRESS,
          value: '0',
          chainSpecific: {
            contractData: data,
            from: connectedWalletEthAddress,
          },
        })
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
            return await (adapter as unknown as ethereum.ChainAdapter).buildCustomTx({
              to: UNISWAP_V2_ROUTER_ADDRESS,
              value: '0',
              wallet,
              data,
              gasLimit,
              bip44Params: adapter.buildBIP44Params({
                accountNumber: 0,
              }),
              ...(shouldUseEIP1559Fees ? { maxFeePerGas, maxPriorityFeePerGas } : { gasPrice }),
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
        return broadcastTXID
      } catch (error) {
        console.warn(error)
      }
    },
    [
      adapter,
      connectedWalletEthAddress,
      ethAsset.chainId,
      foxFarmingContract,
      lpAsset.precision,
      supportedEvmChainIds,
      wallet,
    ],
  )

  const unstake = useCallback(
    async (lpAmount: string) => {
      try {
        if (!connectedWalletEthAddress || !foxFarmingContract || !wallet) return
        const chainAdapterManager = getChainAdapterManager()
        const adapter = chainAdapterManager.get(ethAsset.chainId) as ChainAdapter<KnownChainIds>
        if (!adapter)
          throw new Error(`foxFarmingUnstake: no adapter available for ${ethAsset.chainId}`)
        const data = foxFarmingContract.interface.encodeFunctionData('withdraw', [
          bnOrZero(lpAmount).times(bnOrZero(10).exponentiatedBy(lpAsset.precision)).toFixed(0),
        ])
        const adapterType = adapter.getChainId()
        const estimatedFees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
          to: FOX_FARMING_CONTRACT_ADDRESS,
          value: '0',
          chainSpecific: {
            contractData: data,
            from: connectedWalletEthAddress,
          },
        })
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
            return await (adapter as unknown as ethereum.ChainAdapter).buildCustomTx({
              to: FOX_FARMING_CONTRACT_ADDRESS,
              value: '0',
              wallet,
              data,
              gasLimit,
              bip44Params: adapter.buildBIP44Params({
                accountNumber: 0,
              }),
              ...(shouldUseEIP1559Fees ? { maxFeePerGas, maxPriorityFeePerGas } : { gasPrice }),
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
        return broadcastTXID
      } catch (error) {
        console.warn(error)
      }
    },
    [
      connectedWalletEthAddress,
      ethAsset.chainId,
      foxFarmingContract,
      lpAsset.precision,
      supportedEvmChainIds,
      wallet,
    ],
  )

  const calculateHoldings = useCallback(async () => {
    if (!foxFarmingContract || !connectedWalletEthAddress) return
    const stakedBalance = await foxFarmingContract.balanceOf(connectedWalletEthAddress)
    const unclaimedRewards = await foxFarmingContract.earned(connectedWalletEthAddress)

    return {
      stakedBalance: bnOrZero(stakedBalance.toString()).toString(),
      unclaimedRewards: bnOrZero(unclaimedRewards.toString()).toString(),
    }
  }, [foxFarmingContract, connectedWalletEthAddress])

  const getTVL = useCallback(async () => {
    if (foxFarmingContract) {
      const totalSupply = await foxFarmingContract.totalSupply()
      const lpTokenPrice = await getLpTokenPrice()
      if (!lpTokenPrice) return ''
      const totalDeposited = bnOrZero(totalSupply.toString())
        .div(`1e${lpAsset.precision}`)
        .times(lpTokenPrice)
        .toFixed(2)
      return totalDeposited
    }
  }, [foxFarmingContract, getLpTokenPrice, lpAsset.precision])

  const allowance = useCallback(async () => {
    if (!connectedWalletEthAddress || !uniV2LPContract) return
    const _allowance = await uniV2LPContract.allowance(
      connectedWalletEthAddress,
      foxFarmingContract.address,
    )
    return _allowance.toString()
  }, [connectedWalletEthAddress, foxFarmingContract.address, uniV2LPContract])

  const getApproveGasData = useCallback(async () => {
    if (adapter && connectedWalletEthAddress && uniV2LPContract) {
      const data = uniV2LPContract.interface.encodeFunctionData('approve', [
        foxFarmingContract,
        MAX_ALLOWANCE,
      ])
      const fees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
        to: uniV2LPContract.address,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: connectedWalletEthAddress,
          contractAddress: uniV2LPContract.address,
        },
      })
      return fees
    }
  }, [adapter, connectedWalletEthAddress, foxFarmingContract, uniV2LPContract])

  const getStakeGasData = useCallback(
    async (lpAmount: string) => {
      if (!connectedWalletEthAddress || !uniswapRouterContract) return
      const data = foxFarmingContract.interface.encodeFunctionData('stake', [
        bnOrZero(lpAmount).times(bnOrZero(10).exponentiatedBy(lpAsset.precision)).toFixed(0),
      ])
      const estimatedFees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
        to: FOX_FARMING_CONTRACT_ADDRESS,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: connectedWalletEthAddress,
        },
      })
      return estimatedFees
    },
    [
      adapter,
      connectedWalletEthAddress,
      foxFarmingContract.interface,
      lpAsset.precision,
      uniswapRouterContract,
    ],
  )

  const getUnstakeGasData = useCallback(
    async (lpAmount: string) => {
      if (!connectedWalletEthAddress || !uniswapRouterContract) return
      const data = foxFarmingContract.interface.encodeFunctionData('withdraw', [
        bnOrZero(lpAmount).times(bnOrZero(10).exponentiatedBy(lpAsset.precision)).toFixed(0),
      ])
      const estimatedFees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
        to: FOX_FARMING_CONTRACT_ADDRESS,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: connectedWalletEthAddress,
        },
      })
      return estimatedFees
    },
    [
      adapter,
      connectedWalletEthAddress,
      foxFarmingContract.interface,
      lpAsset.precision,
      uniswapRouterContract,
    ],
  )

  const approve = useCallback(async () => {
    if (!wallet || !uniV2LPContract) return
    const data = uniV2LPContract.interface.encodeFunctionData('approve', [
      FOX_FARMING_CONTRACT_ADDRESS,
      MAX_ALLOWANCE,
    ])
    const gasData = await getApproveGasData()
    if (!gasData) return
    const fees = gasData.average as FeeData<EvmChainId>
    const {
      chainSpecific: { gasPrice, gasLimit },
    } = fees
    if (gasPrice === undefined) {
      throw new Error(`approve: missing gasPrice for non-EIP-1559 tx`)
    }
    const result = await (adapter as unknown as ethereum.ChainAdapter).buildCustomTx({
      to: uniV2LPContract.address,
      value: '0',
      wallet,
      data,
      gasLimit,
      bip44Params: adapter.buildBIP44Params({
        accountNumber: 0,
      }),
      gasPrice,
    })
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
    return broadcastTXID
  }, [adapter, getApproveGasData, uniV2LPContract, wallet])

  const claimRewards = useCallback(async () => {
    if (!wallet || !uniV2LPContract || !connectedWalletEthAddress) return
    const data = uniV2LPContract.interface.encodeFunctionData('getReward')
    const estimatedFees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
      to: FOX_FARMING_CONTRACT_ADDRESS,
      value: '0',
      chainSpecific: {
        contractData: data,
        from: connectedWalletEthAddress,
      },
    })
    const fees = estimatedFees.average as FeeData<EvmChainId>
    const {
      chainSpecific: { gasPrice, gasLimit },
    } = fees
    if (gasPrice === undefined) {
      throw new Error(`approve: missing gasPrice for non-EIP-1559 tx`)
    }
    const result = await (adapter as unknown as ethereum.ChainAdapter).buildCustomTx({
      to: FOX_FARMING_CONTRACT_ADDRESS,
      value: '0',
      wallet,
      data,
      gasLimit,
      bip44Params: adapter.buildBIP44Params({
        accountNumber: 0,
      }),
      gasPrice,
    })
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
    return broadcastTXID
  }, [adapter, connectedWalletEthAddress, uniV2LPContract, wallet])

  return {
    allowance,
    approve,
    calculateHoldings,
    getApproveGasData,
    getStakeGasData,
    getTVL,
    getUnstakeGasData,
    stake,
    unstake,
    claimRewards,
  }
}
