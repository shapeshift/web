import { Contract } from '@ethersproject/contracts'
import { ethAssetId, ethChainId, toAccountId } from '@shapeshiftoss/caip'
import type {
  ChainAdapter,
  ethereum,
  EvmBaseAdapter,
  EvmChainId,
  FeeData,
} from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import isNumber from 'lodash/isNumber'
import { getEthersProvider } from 'plugins/foxPage/utils'
import { useCallback, useMemo } from 'react'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { selectAccountNumberByAccountId, selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import IUniswapV2Router02ABI from '../../fox-eth-lp/abis/IUniswapV2Router02.json'
import {
  foxEthLpAssetId,
  MAX_ALLOWANCE,
  UNISWAP_V2_ROUTER_ADDRESS,
  UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
} from '../../fox-eth-lp/constants'
import farmAbi from '../abis/farmingAbi.json'
const moduleLogger = logger.child({ namespace: ['useFoxFarming'] })

const ethersProvider = getEthersProvider()

/**
 * useFoxFarming hook
 * @param contractAddress farming contract address, since there could be multiple contracts
 */
export const useFoxFarming = (contractAddress: string) => {
  const { accountAddress } = useFoxEth()
  const { supportedEvmChainIds } = useEvm()
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const lpAsset = useAppSelector(state => selectAssetById(state, foxEthLpAssetId))

  const accountId = useMemo(
    () =>
      accountAddress
        ? toAccountId({
            chainId: ethChainId,
            account: accountAddress,
          })
        : '',
    [accountAddress],
  )

  const filter = useMemo(() => ({ accountId }), [accountId])

  const accountNumber = useAppSelector(state => selectAccountNumberByAccountId(state, filter))

  const {
    state: { wallet },
  } = useWallet()

  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(ethAsset.chainId) as ChainAdapter<KnownChainIds>

  const uniswapRouterContract = useMemo(
    () => new Contract(UNISWAP_V2_ROUTER_ADDRESS, IUniswapV2Router02ABI.abi, ethersProvider),
    [],
  )

  const foxFarmingContract = useMemo(
    () => new Contract(contractAddress, farmAbi, ethersProvider),
    [contractAddress],
  )

  const uniV2LPContract = useMemo(
    () => new Contract(UNISWAP_V2_WETH_FOX_POOL_ADDRESS, IUniswapV2Pair.abi, ethersProvider),
    [],
  )

  const stake = useCallback(
    async (lpAmount: string) => {
      try {
        if (!accountAddress || !isNumber(accountNumber) || !foxFarmingContract || !wallet) return
        if (!adapter)
          throw new Error(`addLiquidityEth: no adapter available for ${ethAsset.chainId}`)
        const data = foxFarmingContract.interface.encodeFunctionData('stake', [
          bnOrZero(lpAmount).times(bnOrZero(10).exponentiatedBy(lpAsset.precision)).toFixed(0),
        ])
        const adapterType = adapter.getChainId()
        const estimatedFees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
          to: contractAddress,
          value: '0',
          chainSpecific: {
            contractData: data,
            from: accountAddress,
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
              to: contractAddress,
              value: '0x00',
              wallet,
              data,
              gasLimit,
              bip44Params: adapter.buildBIP44Params({
                accountNumber,
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
        moduleLogger.warn(error, 'useFoxFarming:stake error')
      }
    },
    [
      adapter,
      accountAddress,
      accountNumber,
      contractAddress,
      ethAsset.chainId,
      foxFarmingContract,
      lpAsset.precision,
      supportedEvmChainIds,
      wallet,
    ],
  )

  const unstake = useCallback(
    async (lpAmount: string, isExiting: boolean) => {
      try {
        if (!accountAddress || !isNumber(accountNumber) || !foxFarmingContract || !wallet) return
        const chainAdapterManager = getChainAdapterManager()
        const adapter = chainAdapterManager.get(ethAsset.chainId) as ChainAdapter<KnownChainIds>
        if (!adapter)
          throw new Error(`foxFarmingUnstake: no adapter available for ${ethAsset.chainId}`)
        const data = isExiting
          ? foxFarmingContract.interface.encodeFunctionData('exit')
          : foxFarmingContract.interface.encodeFunctionData('withdraw', [
              bnOrZero(lpAmount).times(bnOrZero(10).exponentiatedBy(lpAsset.precision)).toFixed(0),
            ])
        const adapterType = adapter.getChainId()
        const estimatedFees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
          to: contractAddress,
          value: '0',
          chainSpecific: {
            contractData: data,
            from: accountAddress,
          },
        })
        const result = await (async () => {
          if (supportedEvmChainIds.includes(adapterType)) {
            if (!supportsETH(wallet))
              throw new Error(`unstakeEthFoxLp: wallet does not support ethereum`)
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
              to: contractAddress,
              value: '0x00',
              wallet,
              data,
              gasLimit,
              bip44Params: adapter.buildBIP44Params({
                accountNumber,
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
        moduleLogger.warn(error, 'useFoxFarming:unstake error')
      }
    },
    [
      accountAddress,
      accountNumber,
      contractAddress,
      ethAsset.chainId,
      foxFarmingContract,
      lpAsset.precision,
      supportedEvmChainIds,
      wallet,
    ],
  )

  const allowance = useCallback(async () => {
    if (!accountAddress || !uniV2LPContract) return
    const _allowance = await uniV2LPContract.allowance(accountAddress, contractAddress)
    return _allowance.toString()
  }, [accountAddress, contractAddress, uniV2LPContract])

  const getApproveGasData = useCallback(async () => {
    if (adapter && accountAddress && uniV2LPContract) {
      const data = uniV2LPContract.interface.encodeFunctionData('approve', [
        contractAddress,
        MAX_ALLOWANCE,
      ])
      const fees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
        to: uniV2LPContract.address,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: accountAddress,
          contractAddress: uniV2LPContract.address,
        },
      })
      return fees
    }
  }, [adapter, accountAddress, contractAddress, uniV2LPContract])

  const getStakeGasData = useCallback(
    async (lpAmount: string) => {
      if (!accountAddress || !uniswapRouterContract) return
      const data = foxFarmingContract.interface.encodeFunctionData('stake', [
        bnOrZero(lpAmount).times(bnOrZero(10).exponentiatedBy(lpAsset.precision)).toFixed(0),
      ])
      const estimatedFees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
        to: contractAddress,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: accountAddress,
        },
      })
      return estimatedFees
    },
    [
      adapter,
      accountAddress,
      contractAddress,
      foxFarmingContract.interface,
      lpAsset.precision,
      uniswapRouterContract,
    ],
  )

  const getUnstakeGasData = useCallback(
    async (lpAmount: string, isExiting: boolean) => {
      if (!accountAddress || !uniswapRouterContract) return
      const data = isExiting
        ? foxFarmingContract.interface.encodeFunctionData('exit')
        : foxFarmingContract.interface.encodeFunctionData('withdraw', [
            bnOrZero(lpAmount).times(bnOrZero(10).exponentiatedBy(lpAsset.precision)).toFixed(0),
          ])
      const estimatedFees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
        to: contractAddress,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: accountAddress,
        },
      })
      return estimatedFees
    },
    [
      adapter,
      accountAddress,
      contractAddress,
      foxFarmingContract.interface,
      lpAsset.precision,
      uniswapRouterContract,
    ],
  )

  const approve = useCallback(async () => {
    if (!wallet || !isNumber(accountNumber) || !uniV2LPContract) return
    const data = uniV2LPContract.interface.encodeFunctionData('approve', [
      contractAddress,
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
      value: '0x00',
      wallet,
      data,
      gasLimit,
      bip44Params: adapter.buildBIP44Params({
        accountNumber,
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
  }, [accountNumber, adapter, contractAddress, getApproveGasData, uniV2LPContract, wallet])

  const getClaimGasData = useCallback(
    async (userAddress: string) => {
      if (!foxFarmingContract || !userAddress) return
      const data = foxFarmingContract.interface.encodeFunctionData('getReward')
      const estimatedFees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
        to: contractAddress,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: userAddress,
        },
      })
      return estimatedFees
    },
    [adapter, contractAddress, foxFarmingContract],
  )

  const claimRewards = useCallback(async () => {
    if (!wallet || !isNumber(accountNumber) || !foxFarmingContract || !accountAddress) return
    const data = foxFarmingContract.interface.encodeFunctionData('getReward')
    const estimatedFees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
      to: contractAddress,
      value: '0',
      chainSpecific: {
        contractData: data,
        from: accountAddress,
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
      to: contractAddress,
      value: '0x00',
      wallet,
      data,
      gasLimit,
      bip44Params: adapter.buildBIP44Params({
        accountNumber,
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
  }, [accountNumber, adapter, accountAddress, contractAddress, foxFarmingContract, wallet])

  return {
    allowance,
    approve,
    getApproveGasData,
    getStakeGasData,
    getClaimGasData,
    getUnstakeGasData,
    stake,
    unstake,
    claimRewards,
    foxFarmingContract,
  }
}
