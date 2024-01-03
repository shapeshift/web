import { MaxUint256 } from '@ethersproject/constants'
import { ethAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { ETH_FOX_POOL_CONTRACT_ADDRESS } from 'contracts/constants'
import { getOrCreateContractByAddress } from 'contracts/contractManager'
import { useCallback, useMemo } from 'react'
import { encodeFunctionData, getAddress } from 'viem'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { toBaseUnit } from 'lib/math'
import { isValidAccountNumber } from 'lib/utils'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
  getFees,
} from 'lib/utils/evm'
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

  const wallet = useWallet().state.wallet

  const adapter = useMemo(() => assertGetEvmChainAdapter(fromAssetId(ethAssetId).chainId), [])

  const foxFarmingContract = useMemo(
    () => getOrCreateContractByAddress(contractAddress),
    [contractAddress],
  )

  const stake = useCallback(
    async (lpAmount: string) => {
      try {
        if (skip || !isValidAccountNumber(accountNumber) || !wallet) return

        const data = encodeFunctionData({
          abi: foxFarmingContract.abi,
          functionName: 'stake',
          args: [BigInt(toBaseUnit(lpAmount, lpAsset.precision))],
        })

        const buildCustomTxInput = await createBuildCustomTxInput({
          accountNumber,
          adapter,
          data,
          to: contractAddress,
          value: '0',
          wallet,
        })

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
      adapter,
      foxFarmingContract.abi,
      lpAsset.precision,
      contractAddress,
    ],
  )

  const unstake = useCallback(
    async (lpAmount: string, isExiting: boolean) => {
      try {
        if (skip || !isValidAccountNumber(accountNumber) || !wallet) return

        const data = encodeFunctionData({
          abi: foxFarmingContract.abi,
          functionName: isExiting ? 'exit' : 'withdraw',
          ...(isExiting ? {} : { args: [BigInt(toBaseUnit(lpAmount, lpAsset.precision))] }),
        })

        const buildCustomTxInput = await createBuildCustomTxInput({
          accountNumber,
          adapter,
          data,
          to: contractAddress,
          value: '0',
          wallet,
        })

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
    [adapter, accountNumber, contractAddress, foxFarmingContract, lpAsset.precision, wallet, skip],
  )

  const allowance = useCallback(async () => {
    if (skip || !farmingAccountId) return

    const userAddress = getAddress(fromAccountId(farmingAccountId).account)
    const _allowance = await uniV2LPContract.read.allowance([userAddress, contractAddress])

    return _allowance.toString()
  }, [farmingAccountId, contractAddress, skip])

  const getApproveFees = useCallback(() => {
    if (!isValidAccountNumber(accountNumber) || !wallet) return

    const data = encodeFunctionData({
      abi: uniV2LPContract.abi,
      functionName: 'approve',
      args: [contractAddress, BigInt(MaxUint256.toString())],
    })

    return getFees({
      accountNumber,
      adapter,
      data,
      to: uniV2LPContract.address,
      value: '0',
      wallet,
    })
  }, [adapter, accountNumber, contractAddress, wallet])

  const getStakeFees = useCallback(
    (lpAmount: string) => {
      if (skip || !isValidAccountNumber(accountNumber) || !wallet) return

      const data = encodeFunctionData({
        abi: foxFarmingContract.abi,
        functionName: 'stake',
        args: [BigInt(toBaseUnit(lpAmount, lpAsset.precision))],
      })

      return getFees({
        accountNumber,
        adapter,
        data,
        to: contractAddress,
        value: '0',
        wallet,
      })
    },
    [adapter, accountNumber, contractAddress, foxFarmingContract, lpAsset.precision, skip, wallet],
  )

  const getUnstakeFees = useCallback(
    (lpAmount: string, isExiting: boolean) => {
      if (skip || !isValidAccountNumber(accountNumber) || !wallet) return

      const data = encodeFunctionData({
        abi: foxFarmingContract.abi,
        functionName: isExiting ? 'exit' : 'withdraw',
        ...(isExiting ? {} : { args: [BigInt(toBaseUnit(lpAmount, lpAsset.precision))] }),
      })

      return getFees({
        accountNumber,
        adapter,
        data,
        to: contractAddress,
        value: '0',
        wallet,
      })
    },
    [adapter, accountNumber, contractAddress, foxFarmingContract, lpAsset.precision, skip, wallet],
  )

  const getClaimFees = useCallback(
    async (userAddress: string) => {
      if (!userAddress || !wallet) return

      const data = encodeFunctionData({
        abi: foxFarmingContract.abi,
        functionName: 'getReward',
      })

      return getFees({
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
      args: [contractAddress, BigInt(MaxUint256.toString())],
    })

    const fees = await getApproveFees()
    if (!fees) return

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
  }, [accountNumber, adapter, contractAddress, getApproveFees, wallet])

  const claimRewards = useCallback(async () => {
    if (skip || !isValidAccountNumber(accountNumber) || !wallet) return

    const data = encodeFunctionData({
      abi: foxFarmingContract.abi,
      functionName: 'getReward',
    })

    const buildCustomTxInput = await createBuildCustomTxInput({
      accountNumber,
      adapter,
      data,
      to: contractAddress,
      value: '0',
      wallet,
    })

    const txid = await buildAndBroadcast({
      adapter,
      buildCustomTxInput,
      receiverAddress: await adapter.getAddress({ accountNumber, wallet }),
    })

    return txid
  }, [accountNumber, adapter, contractAddress, foxFarmingContract, skip, wallet])

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
