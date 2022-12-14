import { MaxUint256 } from '@ethersproject/constants'
import { ethAssetId, fromAccountId } from '@shapeshiftoss/caip'
import type { ethereum, EvmChainId, FeeData } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { useCallback, useMemo } from 'react'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { isValidAccountNumber } from 'lib/utils'
import type { FoxEthStakingContractAddress } from 'state/slices/opportunitiesSlice/constants'
import {
  foxEthLpAssetId,
  foxEthLpContractAddress,
  uniswapV2Router02ContractAddress,
} from 'state/slices/opportunitiesSlice/constants'
import { getOrCreateContract } from 'state/slices/opportunitiesSlice/resolvers/foxFarming/contractManager'
import { selectAccountNumberByAccountId, selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const moduleLogger = logger.child({ namespace: ['useFoxFarming'] })

type UseFoxFarmingOptions = {
  skip?: boolean
}
/**
 * useFoxFarming hook
 * @param contractAddress farming contract address, since there could be multiple contracts
 * @param skip
 */
export const useFoxFarming = (
  contractAddress: FoxEthStakingContractAddress,
  { skip }: UseFoxFarmingOptions = {},
) => {
  const { farmingAccountId } = useFoxEth()
  const { supportedEvmChainIds } = useEvm()
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const lpAsset = useAppSelector(state => selectAssetById(state, foxEthLpAssetId))

  const filter = useMemo(() => ({ accountId: farmingAccountId }), [farmingAccountId])

  const accountNumber = useAppSelector(state => selectAccountNumberByAccountId(state, filter))

  const {
    state: { wallet },
  } = useWallet()

  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(ethAsset.chainId) as unknown as ethereum.ChainAdapter

  const uniswapRouterContract = useMemo(
    () => (skip ? null : getOrCreateContract(uniswapV2Router02ContractAddress)),
    [skip],
  )

  const foxFarmingContract = useMemo(
    () => (skip ? null : getOrCreateContract(contractAddress)),
    [contractAddress, skip],
  )

  const uniV2LPContract = useMemo(
    () => (skip ? null : getOrCreateContract(foxEthLpContractAddress)),
    [skip],
  )

  const stake = useCallback(
    async (lpAmount: string) => {
      try {
        if (
          skip ||
          !farmingAccountId ||
          !isValidAccountNumber(accountNumber) ||
          !foxFarmingContract ||
          !wallet
        )
          return
        if (!adapter)
          throw new Error(`addLiquidityEth: no adapter available for ${ethAsset.chainId}`)
        const data = foxFarmingContract.interface.encodeFunctionData('stake', [
          bnOrZero(lpAmount).times(bnOrZero(10).exponentiatedBy(lpAsset.precision)).toFixed(0),
        ])
        const adapterType = adapter.getChainId()
        const estimatedFees = await adapter.getFeeData({
          to: contractAddress,
          value: '0',
          chainSpecific: {
            contractData: data,
            from: fromAccountId(farmingAccountId).account,
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
            return await adapter.buildCustomTx({
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
      farmingAccountId,
      accountNumber,
      contractAddress,
      ethAsset.chainId,
      foxFarmingContract,
      lpAsset.precision,
      supportedEvmChainIds,
      skip,
      wallet,
    ],
  )

  const unstake = useCallback(
    async (lpAmount: string, isExiting: boolean) => {
      try {
        if (
          skip ||
          !farmingAccountId ||
          !isValidAccountNumber(accountNumber) ||
          !foxFarmingContract ||
          !wallet
        )
          return
        const chainAdapterManager = getChainAdapterManager()
        const adapter = chainAdapterManager.get(
          ethAsset.chainId,
        ) as unknown as ethereum.ChainAdapter
        if (!adapter)
          throw new Error(`foxFarmingUnstake: no adapter available for ${ethAsset.chainId}`)
        const data = isExiting
          ? foxFarmingContract.interface.encodeFunctionData('exit')
          : foxFarmingContract.interface.encodeFunctionData('withdraw', [
              bnOrZero(lpAmount).times(bnOrZero(10).exponentiatedBy(lpAsset.precision)).toFixed(0),
            ])
        const adapterType = adapter.getChainId()
        const estimatedFees = await adapter.getFeeData({
          to: contractAddress,
          value: '0',
          chainSpecific: {
            contractData: data,
            from: fromAccountId(farmingAccountId).account,
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
            return await adapter.buildCustomTx({
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
      farmingAccountId,
      accountNumber,
      contractAddress,
      ethAsset.chainId,
      foxFarmingContract,
      lpAsset.precision,
      supportedEvmChainIds,
      wallet,
      skip,
    ],
  )

  const allowance = useCallback(async () => {
    if (skip || !farmingAccountId || !uniV2LPContract) return
    const userAddress = fromAccountId(farmingAccountId).account
    const _allowance = await uniV2LPContract.allowance(userAddress, contractAddress)
    return _allowance.toString()
  }, [farmingAccountId, contractAddress, uniV2LPContract, skip])

  const getApproveGasData = useCallback(async () => {
    if (adapter && farmingAccountId && uniV2LPContract) {
      const data = uniV2LPContract.interface.encodeFunctionData('approve', [
        contractAddress,
        MaxUint256,
      ])
      const farmingAccountAddress = fromAccountId(farmingAccountId).account
      const fees = await adapter.getFeeData({
        to: uniV2LPContract.address,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: farmingAccountAddress,
          contractAddress: uniV2LPContract.address,
        },
      })
      return fees
    }
  }, [adapter, farmingAccountId, contractAddress, uniV2LPContract])

  const getStakeGasData = useCallback(
    async (lpAmount: string) => {
      if (skip || !farmingAccountId || !uniswapRouterContract) return
      const data = foxFarmingContract!.interface.encodeFunctionData('stake', [
        bnOrZero(lpAmount).times(bnOrZero(10).exponentiatedBy(lpAsset.precision)).toFixed(0),
      ])
      const farmingAccountAddress = fromAccountId(farmingAccountId).account
      const estimatedFees = await adapter.getFeeData({
        to: contractAddress,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: farmingAccountAddress,
        },
      })
      return estimatedFees
    },
    [
      adapter,
      farmingAccountId,
      contractAddress,
      foxFarmingContract,
      lpAsset.precision,
      uniswapRouterContract,
      skip,
    ],
  )

  const getUnstakeGasData = useCallback(
    async (lpAmountCryptoBaseUnit: string, isExiting: boolean) => {
      if (skip || !farmingAccountId || !uniswapRouterContract) return
      const data = isExiting
        ? foxFarmingContract!.interface.encodeFunctionData('exit')
        : foxFarmingContract!.interface.encodeFunctionData('withdraw', [lpAmountCryptoBaseUnit])
      const farmingAccountAddress = fromAccountId(farmingAccountId).account
      const estimatedFees = await adapter.getFeeData({
        to: contractAddress,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: farmingAccountAddress,
        },
      })
      return estimatedFees
    },
    [adapter, farmingAccountId, contractAddress, foxFarmingContract, uniswapRouterContract, skip],
  )

  const approve = useCallback(async () => {
    if (!wallet || !isValidAccountNumber(accountNumber) || !uniV2LPContract) return
    const data = uniV2LPContract.interface.encodeFunctionData('approve', [
      contractAddress,
      MaxUint256,
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
    const result = await adapter.buildCustomTx({
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
      const estimatedFees = await adapter.getFeeData({
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
    if (
      skip ||
      !wallet ||
      !isValidAccountNumber(accountNumber) ||
      !foxFarmingContract ||
      !farmingAccountId
    )
      return
    const data = foxFarmingContract.interface.encodeFunctionData('getReward')
    const farmingAccountAddress = fromAccountId(farmingAccountId).account
    const estimatedFees = await adapter.getFeeData({
      to: contractAddress,
      value: '0',
      chainSpecific: {
        contractData: data,
        from: farmingAccountAddress,
      },
    })
    const fees = estimatedFees.average as FeeData<EvmChainId>
    const {
      chainSpecific: { gasPrice, gasLimit },
    } = fees
    if (gasPrice === undefined) {
      throw new Error(`approve: missing gasPrice for non-EIP-1559 tx`)
    }
    const result = await adapter.buildCustomTx({
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
  }, [accountNumber, adapter, farmingAccountId, contractAddress, foxFarmingContract, skip, wallet])

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
    skip,
  }
}
