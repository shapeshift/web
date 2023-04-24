import { MaxUint256 } from '@ethersproject/constants'
import { ethAssetId, fromAccountId } from '@shapeshiftoss/caip'
import type { ethereum } from '@shapeshiftoss/chain-adapters'
import {
  ETH_FOX_POOL_CONTRACT_ADDRESS,
  UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS,
} from 'contracts/constants'
import { getOrCreateContractByAddress } from 'contracts/contractManager'
import { buildAndBroadcast, getFeeDataFromEstimate } from 'features/defi/helpers/utils'
import { useCallback, useMemo } from 'react'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { isValidAccountNumber } from 'lib/utils'
import type { FoxEthStakingContractAddress } from 'state/slices/opportunitiesSlice/constants'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
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
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const lpAsset = useAppSelector(state => selectAssetById(state, foxEthLpAssetId))

  if (!ethAsset) throw new Error(`Asset not found for AssetId ${ethAssetId}`)
  if (!lpAsset) throw new Error(`Asset not found for AssetId ${foxEthLpAssetId}`)

  const filter = useMemo(() => ({ accountId: farmingAccountId }), [farmingAccountId])

  const accountNumber = useAppSelector(state => selectAccountNumberByAccountId(state, filter))

  const wallet = useWallet().state.wallet

  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(ethAsset.chainId) as unknown as
    | ethereum.ChainAdapter
    | undefined

  const uniswapRouterContract = useMemo(
    () => (skip ? null : getOrCreateContractByAddress(UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS)),
    [skip],
  )

  const foxFarmingContract = useMemo(
    () => (skip ? null : getOrCreateContractByAddress(contractAddress)),
    [contractAddress, skip],
  )

  const uniV2LPContract = useMemo(
    () => (skip ? null : getOrCreateContractByAddress(ETH_FOX_POOL_CONTRACT_ADDRESS)),
    [skip],
  )

  const stake = useCallback(
    async (lpAmount: string) => {
      try {
        if (skip) return
        if (!farmingAccountId) return
        if (!isValidAccountNumber(accountNumber)) return
        if (!foxFarmingContract) return
        if (!wallet) return

        if (!adapter) throw new Error(`no adapter available for ${ethAsset.chainId}`)

        const data = foxFarmingContract.interface.encodeFunctionData('stake', [
          bnOrZero(lpAmount).times(bnOrZero(10).exponentiatedBy(lpAsset.precision)).toFixed(0),
        ])

        const feeData = await adapter.getFeeData({
          to: contractAddress,
          value: '0',
          chainSpecific: {
            contractData: data,
            from: fromAccountId(farmingAccountId).account,
          },
        })

        const txid = await buildAndBroadcast({
          accountNumber,
          adapter,
          feeData: getFeeDataFromEstimate(feeData).chainSpecific,
          to: contractAddress,
          value: '0',
          wallet,
          data,
        })

        return txid
      } catch (err) {
        moduleLogger.error(err, 'failed to stake')
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
      skip,
      wallet,
    ],
  )

  const unstake = useCallback(
    async (lpAmount: string, isExiting: boolean) => {
      try {
        if (skip) return
        if (!farmingAccountId) return
        if (!isValidAccountNumber(accountNumber)) return
        if (!foxFarmingContract) return
        if (!wallet) return

        if (!adapter) throw new Error(`no adapter available for ${ethAsset.chainId}`)

        const data = isExiting
          ? foxFarmingContract.interface.encodeFunctionData('exit')
          : foxFarmingContract.interface.encodeFunctionData('withdraw', [
              bnOrZero(lpAmount).times(bnOrZero(10).exponentiatedBy(lpAsset.precision)).toFixed(0),
            ])

        const feeData = await adapter.getFeeData({
          to: contractAddress,
          value: '0',
          chainSpecific: {
            contractData: data,
            from: fromAccountId(farmingAccountId).account,
          },
        })

        const txid = await buildAndBroadcast({
          accountNumber,
          adapter,
          feeData: getFeeDataFromEstimate(feeData).chainSpecific,
          to: contractAddress,
          value: '0',
          wallet,
          data,
        })

        return txid
      } catch (err) {
        moduleLogger.error(err, 'failed to unstake')
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

  const getApproveFeeData = useCallback(async () => {
    if (!adapter || !farmingAccountId || !uniV2LPContract) return

    const data = uniV2LPContract.interface.encodeFunctionData('approve', [
      contractAddress,
      MaxUint256,
    ])

    const farmingAccountAddress = fromAccountId(farmingAccountId).account

    const feeData = await adapter.getFeeData({
      to: uniV2LPContract.address,
      value: '0',
      chainSpecific: {
        contractData: data,
        from: farmingAccountAddress,
        contractAddress: uniV2LPContract.address,
      },
    })

    return getFeeDataFromEstimate(feeData)
  }, [adapter, farmingAccountId, contractAddress, uniV2LPContract])

  const getStakeFeeData = useCallback(
    async (lpAmount: string) => {
      if (skip || !adapter || !farmingAccountId || !uniswapRouterContract) return

      const data = foxFarmingContract!.interface.encodeFunctionData('stake', [
        bnOrZero(lpAmount).times(bnOrZero(10).exponentiatedBy(lpAsset.precision)).toFixed(0),
      ])

      const farmingAccountAddress = fromAccountId(farmingAccountId).account

      const feeData = await adapter.getFeeData({
        to: contractAddress,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: farmingAccountAddress,
        },
      })

      return getFeeDataFromEstimate(feeData)
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

  const getUnstakeFeeData = useCallback(
    async (lpAmount: string, isExiting: boolean) => {
      if (skip || !adapter || !farmingAccountId || !uniswapRouterContract) return

      const data = isExiting
        ? foxFarmingContract!.interface.encodeFunctionData('exit')
        : foxFarmingContract!.interface.encodeFunctionData('withdraw', [
            bnOrZero(lpAmount).times(bnOrZero(10).exponentiatedBy(lpAsset.precision)).toFixed(0),
          ])

      const farmingAccountAddress = fromAccountId(farmingAccountId).account

      const feeData = await adapter.getFeeData({
        to: contractAddress,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: farmingAccountAddress,
        },
      })

      return getFeeDataFromEstimate(feeData)
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

  const getClaimFeeData = useCallback(
    async (userAddress: string) => {
      if (!adapter || !foxFarmingContract || !userAddress) return

      const data = foxFarmingContract.interface.encodeFunctionData('getReward')

      const feeData = await adapter.getFeeData({
        to: contractAddress,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: userAddress,
        },
      })

      return getFeeDataFromEstimate(feeData)
    },
    [adapter, contractAddress, foxFarmingContract],
  )

  const approve = useCallback(async () => {
    if (!wallet || !isValidAccountNumber(accountNumber) || !uniV2LPContract) return

    if (!adapter) throw new Error(`no adapter available for ${ethAsset.chainId}`)

    const data = uniV2LPContract.interface.encodeFunctionData('approve', [
      contractAddress,
      MaxUint256,
    ])

    const feeData = await getApproveFeeData()
    if (!feeData) return

    const txid = await buildAndBroadcast({
      accountNumber,
      adapter,
      feeData: feeData.chainSpecific,
      to: uniV2LPContract.address,
      value: '0',
      wallet,
      data,
    })

    return txid
  }, [
    accountNumber,
    adapter,
    ethAsset.chainId,
    contractAddress,
    getApproveFeeData,
    uniV2LPContract,
    wallet,
  ])

  const claimRewards = useCallback(async () => {
    if (skip) return
    if (!wallet) return
    if (!isValidAccountNumber(accountNumber)) return
    if (!foxFarmingContract) return
    if (!farmingAccountId) return

    if (!adapter) throw new Error(`no adapter available for ${ethAsset.chainId}`)

    const data = foxFarmingContract.interface.encodeFunctionData('getReward')
    const farmingAccountAddress = fromAccountId(farmingAccountId).account

    const feeData = await adapter.getFeeData({
      to: contractAddress,
      value: '0',
      chainSpecific: {
        contractData: data,
        from: farmingAccountAddress,
      },
    })

    const txid = await buildAndBroadcast({
      accountNumber,
      adapter,
      feeData: getFeeDataFromEstimate(feeData).chainSpecific,
      to: contractAddress,
      value: '0',
      wallet,
      data,
    })

    return txid
  }, [
    accountNumber,
    adapter,
    farmingAccountId,
    ethAsset.chainId,
    contractAddress,
    foxFarmingContract,
    skip,
    wallet,
  ])

  return {
    allowance,
    approve,
    getApproveFeeData,
    getStakeFeeData,
    getClaimFeeData,
    getUnstakeFeeData,
    stake,
    unstake,
    claimRewards,
    foxFarmingContract,
    skip,
  }
}
