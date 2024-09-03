import { ethAssetId, ethChainId, fromAccountId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION, evm } from '@shapeshiftoss/chain-adapters'
import type { FoxEthStakingContractAddress } from '@shapeshiftoss/contracts'
import {
  ETH_FOX_POOL_CONTRACT_ADDRESS,
  getOrCreateContractByAddress,
} from '@shapeshiftoss/contracts'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { useCallback, useMemo } from 'react'
import { encodeFunctionData, getAddress, maxUint256 } from 'viem'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useLedgerOpenApp } from 'hooks/useLedgerOpenApp/useLedgerOpenApp'
import { useWallet } from 'hooks/useWallet/useWallet'
import { toBaseUnit } from 'lib/math'
import { isValidAccountNumber } from 'lib/utils/accounts'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
  getFeesWithWalletEIP1559Support,
} from 'lib/utils/evm'
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
  const checkLedgerAppOpenIfLedgerConnected = useLedgerOpenApp({ isSigning: true })

  const { farmingAccountId } = useFoxEth()
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const lpAsset = useAppSelector(state => selectAssetById(state, foxEthLpAssetId))

  if (!ethAsset) throw new Error(`Asset not found for AssetId ${ethAssetId}`)
  if (!lpAsset) throw new Error(`Asset not found for AssetId ${foxEthLpAssetId}`)

  const filter = useMemo(() => ({ accountId: farmingAccountId }), [farmingAccountId])

  const accountNumber = useAppSelector(state => selectAccountNumberByAccountId(state, filter))

  const wallet = useWallet().state.wallet

  const adapter = useMemo(() => assertGetEvmChainAdapter(ethChainId), [])

  const foxFarmingContract = useMemo(
    () => getOrCreateContractByAddress(contractAddress),
    [contractAddress],
  )

  const userAddress = useMemo(
    () => (farmingAccountId ? getAddress(fromAccountId(farmingAccountId).account) : undefined),
    [farmingAccountId],
  )

  const stake = useCallback(
    async (lpAmount: string) => {
      try {
        if (skip || !isValidAccountNumber(accountNumber) || !wallet || !userAddress) return

        const data = encodeFunctionData({
          abi: foxFarmingContract.abi,
          functionName: 'stake',
          args: [BigInt(toBaseUnit(lpAmount, lpAsset.precision))],
        })

        const buildCustomTxInput = await createBuildCustomTxInput({
          accountNumber,
          from: userAddress,
          adapter,
          data,
          to: contractAddress,
          value: '0',
          wallet,
        })

        await checkLedgerAppOpenIfLedgerConnected(ethChainId)

        const txid = await buildAndBroadcast({
          adapter,
          buildCustomTxInput,
          receiverAddress: CONTRACT_INTERACTION, // no receiver for this contract call
        })

        return txid
      } catch (err) {
        console.error(err)
      }
    },
    [
      skip,
      accountNumber,
      wallet,
      userAddress,
      foxFarmingContract.abi,
      lpAsset.precision,
      adapter,
      contractAddress,
      checkLedgerAppOpenIfLedgerConnected,
    ],
  )

  const unstake = useCallback(
    async (lpAmount: string, isExiting: boolean) => {
      try {
        if (skip || !isValidAccountNumber(accountNumber) || !wallet || !userAddress) return

        const data = encodeFunctionData({
          abi: foxFarmingContract.abi,
          functionName: isExiting ? 'exit' : 'withdraw',
          ...(isExiting ? {} : { args: [BigInt(toBaseUnit(lpAmount, lpAsset.precision))] }),
        })

        const buildCustomTxInput = await createBuildCustomTxInput({
          accountNumber,
          from: userAddress,
          adapter,
          data,
          to: contractAddress,
          value: '0',
          wallet,
        })

        await checkLedgerAppOpenIfLedgerConnected(ethChainId)

        const txid = await buildAndBroadcast({
          adapter,
          buildCustomTxInput,
          receiverAddress: await adapter.getAddress({ accountNumber, wallet }),
        })

        return txid
      } catch (err) {
        console.error(err)
      }
    },
    [
      skip,
      accountNumber,
      wallet,
      userAddress,
      foxFarmingContract.abi,
      lpAsset.precision,
      adapter,
      contractAddress,
      checkLedgerAppOpenIfLedgerConnected,
    ],
  )

  const allowance = useCallback(async () => {
    if (skip || !userAddress) return

    const _allowance = await uniV2LPContract.read.allowance([userAddress, contractAddress])

    return _allowance.toString()
  }, [skip, userAddress, contractAddress])

  const getApproveFees = useCallback(() => {
    if (!isValidAccountNumber(accountNumber) || !wallet || !userAddress) return

    const data = encodeFunctionData({
      abi: uniV2LPContract.abi,
      functionName: 'approve',
      args: [contractAddress, maxUint256],
    })

    return getFeesWithWalletEIP1559Support({
      adapter,
      data,
      to: uniV2LPContract.address,
      from: userAddress,
      value: '0',
      wallet,
    })
  }, [accountNumber, wallet, userAddress, contractAddress, adapter])

  const getStakeFees = useCallback(
    (lpAmount: string) => {
      if (skip || !isValidAccountNumber(accountNumber) || !wallet || !userAddress) return

      const data = encodeFunctionData({
        abi: foxFarmingContract.abi,
        functionName: 'stake',
        args: [BigInt(toBaseUnit(lpAmount, lpAsset.precision))],
      })

      return getFeesWithWalletEIP1559Support({
        adapter,
        data,
        to: contractAddress,
        from: userAddress,
        value: '0',
        wallet,
      })
    },
    [
      skip,
      accountNumber,
      wallet,
      userAddress,
      foxFarmingContract.abi,
      lpAsset.precision,
      adapter,
      contractAddress,
    ],
  )

  const getUnstakeFees = useCallback(
    (lpAmount: string, isExiting: boolean) => {
      if (skip || !isValidAccountNumber(accountNumber) || !wallet || !userAddress) return

      const data = encodeFunctionData({
        abi: foxFarmingContract.abi,
        functionName: isExiting ? 'exit' : 'withdraw',
        ...(isExiting ? {} : { args: [BigInt(toBaseUnit(lpAmount, lpAsset.precision))] }),
      })

      return getFeesWithWalletEIP1559Support({
        adapter,
        data,
        to: contractAddress,
        from: userAddress,
        value: '0',
        wallet,
      })
    },
    [
      skip,
      accountNumber,
      wallet,
      foxFarmingContract.abi,
      lpAsset.precision,
      adapter,
      contractAddress,
      userAddress,
    ],
  )

  const getClaimFees = useCallback(
    async (userAddress: string) => {
      if (!userAddress || !wallet) return

      const data = encodeFunctionData({
        abi: foxFarmingContract.abi,
        functionName: 'getReward',
      })

      return evm.getFees({
        adapter,
        data,
        from: userAddress,
        to: contractAddress,
        value: '0',
        supportsEIP1559: supportsETH(wallet) && (await wallet.ethSupportsEIP1559()),
      })
    },
    [adapter, contractAddress, foxFarmingContract, wallet],
  )

  const approve = useCallback(async () => {
    if (!wallet || !isValidAccountNumber(accountNumber)) return

    const data = encodeFunctionData({
      abi: uniV2LPContract.abi,
      functionName: 'approve',
      args: [contractAddress, maxUint256],
    })

    const fees = await getApproveFees()
    if (!fees) return

    await checkLedgerAppOpenIfLedgerConnected(ethChainId)

    const txid = await buildAndBroadcast({
      adapter,
      receiverAddress: CONTRACT_INTERACTION, // no receiver for this contract call
      buildCustomTxInput: {
        accountNumber,
        to: uniV2LPContract.address,
        value: '0',
        data,
        wallet,
        ...fees,
      },
    })

    return txid
  }, [
    accountNumber,
    adapter,
    checkLedgerAppOpenIfLedgerConnected,
    contractAddress,
    getApproveFees,
    wallet,
  ])

  const claimRewards = useCallback(async () => {
    if (skip || !isValidAccountNumber(accountNumber) || !wallet || !userAddress) return

    const data = encodeFunctionData({
      abi: foxFarmingContract.abi,
      functionName: 'getReward',
    })

    const buildCustomTxInput = await createBuildCustomTxInput({
      accountNumber,
      from: userAddress,
      adapter,
      data,
      to: contractAddress,
      value: '0',
      wallet,
    })

    await checkLedgerAppOpenIfLedgerConnected(ethChainId)

    const txid = await buildAndBroadcast({
      adapter,
      buildCustomTxInput,
      receiverAddress: await adapter.getAddress({ accountNumber, wallet }),
    })

    return txid
  }, [
    accountNumber,
    adapter,
    checkLedgerAppOpenIfLedgerConnected,
    contractAddress,
    foxFarmingContract.abi,
    skip,
    userAddress,
    wallet,
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
