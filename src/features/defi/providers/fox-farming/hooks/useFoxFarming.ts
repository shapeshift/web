import { MaxUint256 } from '@ethersproject/constants'
import { ethAssetId, fromAccountId } from '@shapeshiftoss/caip'
import type { ethereum } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { ETH_FOX_POOL_CONTRACT_ADDRESS } from 'contracts/constants'
import { getOrCreateContractByAddress } from 'contracts/contractManager'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { toBaseUnit } from 'lib/math'
import { isValidAccountNumber } from 'lib/utils'
import { buildAndBroadcast, createBuildCustomTxInput, getFees } from 'lib/utils/evm'
import type { FoxEthStakingContractAddress } from 'state/slices/opportunitiesSlice/constants'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import { selectAccountNumberByAccountId, selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UseFoxFarmingOptions = {
  skip?: boolean
}

const uniV2LPContract = getOrCreateContractByAddress(ETH_FOX_POOL_CONTRACT_ADDRESS)

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
  const accountAddress = useMemo(
    () => (farmingAccountId ? fromAccountId(farmingAccountId).account : undefined),
    [farmingAccountId],
  )

  const wallet = useWallet().state.wallet
  const [supportsEIP1559, setSupportsEIP1559] = useState(false)
  useEffect(() => {
    if (!wallet) return
    ;(async () => {
      if (supportsETH(wallet)) {
        const result = await wallet.ethSupportsEIP1559()
        setSupportsEIP1559(result)
      }
    })()
  }, [wallet])

  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(ethAsset.chainId) as unknown as
    | ethereum.ChainAdapter
    | undefined

  const foxFarmingContract = useMemo(
    () => getOrCreateContractByAddress(contractAddress),
    [contractAddress],
  )

  const stake = useCallback(
    async (lpAmount: string) => {
      try {
        if (skip || !isValidAccountNumber(accountNumber) || !wallet || !accountAddress) return

        if (!adapter) throw new Error(`no adapter available for ${ethAsset.chainId}`)

        const data = foxFarmingContract.interface.encodeFunctionData('stake', [
          toBaseUnit(lpAmount, lpAsset.precision),
        ])

        const fees = await getFees({
          from: accountAddress,
          adapter,
          data,
          to: contractAddress,
          value: '0',
          supportsEIP1559,
        })

        const buildCustomTxInput = await createBuildCustomTxInput({
          accountNumber,
          adapter,
          data,
          to: contractAddress,
          value: '0',
          wallet,
          chainSpecific: fees,
        })

        const txid = await buildAndBroadcast({ adapter, buildCustomTxInput })

        return txid
      } catch (err) {
        console.error(err)
      }
    },
    [
      skip,
      accountNumber,
      wallet,
      adapter,
      ethAsset.chainId,
      foxFarmingContract.interface,
      lpAsset.precision,
      accountAddress,
      contractAddress,
      supportsEIP1559,
    ],
  )

  const unstake = useCallback(
    async (lpAmount: string, isExiting: boolean) => {
      try {
        if (skip || !isValidAccountNumber(accountNumber) || !wallet || !accountAddress) return

        if (!adapter) throw new Error(`no adapter available for ${ethAsset.chainId}`)

        const data = isExiting
          ? foxFarmingContract.interface.encodeFunctionData('exit')
          : foxFarmingContract.interface.encodeFunctionData('withdraw', [
              toBaseUnit(lpAmount, lpAsset.precision),
            ])

        const fees = await getFees({
          from: accountAddress,
          adapter,
          data,
          to: contractAddress,
          value: '0',
          supportsEIP1559,
        })

        const buildCustomTxInput = await createBuildCustomTxInput({
          accountNumber,
          adapter,
          data,
          to: contractAddress,
          value: '0',
          wallet,
          chainSpecific: fees,
        })

        const txid = await buildAndBroadcast({ adapter, buildCustomTxInput })

        return txid
      } catch (err) {
        console.error(err)
      }
    },
    [
      skip,
      accountNumber,
      wallet,
      adapter,
      ethAsset.chainId,
      foxFarmingContract.interface,
      lpAsset.precision,
      accountAddress,
      contractAddress,
      supportsEIP1559,
    ],
  )

  const allowance = useCallback(async () => {
    if (skip || !farmingAccountId) return

    const userAddress = fromAccountId(farmingAccountId).account
    const _allowance = await uniV2LPContract.allowance(userAddress, contractAddress)

    return _allowance.toString()
  }, [farmingAccountId, contractAddress, skip])

  const getApproveFees = useCallback(() => {
    if (!adapter || !isValidAccountNumber(accountNumber) || !accountAddress) return

    const data = uniV2LPContract.interface.encodeFunctionData('approve', [
      contractAddress,
      MaxUint256,
    ])

    return getFees({
      from: accountAddress,
      supportsEIP1559,
      adapter,
      data,
      to: uniV2LPContract.address,
      value: '0',
    })
  }, [adapter, accountNumber, accountAddress, contractAddress, supportsEIP1559])

  const getStakeFees = useCallback(
    (lpAmount: string) => {
      if (skip || !adapter || !isValidAccountNumber(accountNumber) || !accountAddress) return

      const data = foxFarmingContract.interface.encodeFunctionData('stake', [
        toBaseUnit(lpAmount, lpAsset.precision),
      ])

      return getFees({
        supportsEIP1559,
        from: accountAddress,
        adapter,
        data,
        to: contractAddress,
        value: '0',
      })
    },
    [
      skip,
      adapter,
      accountNumber,
      accountAddress,
      foxFarmingContract.interface,
      lpAsset.precision,
      supportsEIP1559,
      contractAddress,
    ],
  )

  const getUnstakeFees = useCallback(
    (lpAmount: string, isExiting: boolean) => {
      if (skip || !adapter || !isValidAccountNumber(accountNumber) || !accountAddress) return

      const data = isExiting
        ? foxFarmingContract.interface.encodeFunctionData('exit')
        : foxFarmingContract.interface.encodeFunctionData('withdraw', [
            toBaseUnit(lpAmount, lpAsset.precision),
          ])

      return getFees({
        supportsEIP1559,
        from: accountAddress,
        adapter,
        data,
        to: contractAddress,
        value: '0',
      })
    },
    [
      skip,
      adapter,
      accountNumber,
      foxFarmingContract.interface,
      lpAsset.precision,
      supportsEIP1559,
      accountAddress,
      contractAddress,
    ],
  )

  const getClaimFees = useCallback(
    (userAddress: string) => {
      if (!adapter || !userAddress || !wallet) return

      const data = foxFarmingContract.interface.encodeFunctionData('getReward')

      return getFees({
        supportsEIP1559,
        adapter,
        data,
        from: userAddress,
        to: contractAddress,
        value: '0',
      })
    },
    [adapter, contractAddress, foxFarmingContract.interface, supportsEIP1559, wallet],
  )

  const approve = useCallback(async () => {
    if (!isValidAccountNumber(accountNumber) || !accountAddress) return

    if (!adapter) throw new Error(`no adapter available for ${ethAsset.chainId}`)

    const data = uniV2LPContract.interface.encodeFunctionData('approve', [
      contractAddress,
      MaxUint256,
    ])

    const fees = await getApproveFees()
    if (!fees) return

    const txid = await buildAndBroadcast({
      adapter,
      buildCustomTxInput: {
        from: accountAddress,
        accountNumber,
        to: uniV2LPContract.address,
        value: '0',
        data,
        ...fees,
      },
    })

    return txid
  }, [accountNumber, adapter, ethAsset.chainId, contractAddress, getApproveFees, accountAddress])

  const claimRewards = useCallback(async () => {
    if (skip || !isValidAccountNumber(accountNumber) || !wallet || !accountAddress) return

    if (!adapter) throw new Error(`no adapter available for ${ethAsset.chainId}`)

    const data = foxFarmingContract.interface.encodeFunctionData('getReward')

    const fees = await getFees({
      from: accountAddress,
      adapter,
      data,
      to: contractAddress,
      value: '0',
      supportsEIP1559,
    })

    const buildCustomTxInput = await createBuildCustomTxInput({
      accountNumber,
      adapter,
      data,
      to: contractAddress,
      value: '0',
      wallet,
      chainSpecific: fees,
    })

    const txid = await buildAndBroadcast({ adapter, buildCustomTxInput })

    return txid
  }, [
    skip,
    accountNumber,
    wallet,
    adapter,
    ethAsset.chainId,
    foxFarmingContract.interface,
    accountAddress,
    contractAddress,
    supportsEIP1559,
  ])

  return {
    allowance,
    approve,
    getApproveFees,
    getStakeFees,
    getClaimFees,
    getUnstakeFees,
    stake,
    unstake,
    claimRewards,
    foxFarmingContract,
    skip,
  }
}
