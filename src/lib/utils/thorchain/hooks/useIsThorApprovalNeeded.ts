import type { AccountId } from '@shapeshiftoss/caip'
import { type AssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { reactQueries } from 'react-queries'
import { useAllowance } from 'react-queries/hooks/useAllowance'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { useRouterContractAddress } from 'lib/swapper/swappers/ThorchainSwapper/utils/useRouterContractAddress'
import { isToken } from 'lib/utils'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

type UseThorAllowanceProps = {
  assetId: AssetId | undefined
  accountId: AccountId | undefined
  amountCryptoPrecision: string | null | undefined
}

export const useThorAllowance = ({
  assetId,
  accountId,
  amountCryptoPrecision,
}: UseThorAllowanceProps) => {
  const {
    state: { wallet },
  } = useWallet()

  const [approvalTxId, setApprovalTxId] = useState<string | null>(null)
  const accountNumberFilter = useMemo(() => ({ accountId }), [accountId])
  const repaymentAccountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, accountNumberFilter),
  )
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  const { routerContractAddress, isLoading: isRouterContractAddressLoading } =
    useRouterContractAddress({
      assetId,
      skip: !assetId || !isToken(fromAssetId(assetId).assetReference),
      excludeHalted: true,
    })

  const userAddress = useMemo(() => {
    if (!accountId) return undefined

    return fromAccountId(accountId).account
  }, [accountId])

  const { data: allowanceData, isLoading: isAllowanceDataLoading } = useAllowance({
    assetId: asset?.assetId,
    spender: routerContractAddress,
    from: userAddress,
  })

  const isApprovalRequired = useMemo(() => {
    if (!assetId || !asset) return false
    if (!isToken(fromAssetId(assetId).assetReference)) return false

    const allowanceCryptoPrecision = fromBaseUnit(allowanceData ?? '0', asset.precision)
    return bnOrZero(amountCryptoPrecision).gt(allowanceCryptoPrecision)
  }, [allowanceData, amountCryptoPrecision, asset, assetId])

  const {
    mutate: _approve,
    mutateAsync: _approveAsync,
    isPending: isApprovalPending,
    isSuccess: isApprovalSuccess,
    isIdle: isApprovalIdle,
  } = useMutation({
    ...reactQueries.mutations.approve({
      assetId,
      spender: routerContractAddress,
      from: userAddress,
      amount: toBaseUnit(amountCryptoPrecision ?? 0, asset?.precision ?? 0),
      wallet,
      accountNumber: repaymentAccountNumber,
    }),
    onSuccess: (txId: string) => {
      queryClient.invalidateQueries({ queryKey: ['allowanceCryptoBaseUnit'], exact: false })
      setApprovalTxId(txId)
    },
  })

  const approve = useCallback(() => _approve(undefined), [_approve])
  const approveAsync = useCallback(() => _approveAsync(undefined), [_approveAsync])

  const serializedApprovalTxIndex = useMemo(() => {
    if (!(approvalTxId && userAddress && accountId)) return ''
    return serializeTxIndex(accountId, approvalTxId, userAddress)
  }, [approvalTxId, userAddress, accountId])
  const approvalTx = useAppSelector(gs => selectTxById(gs, serializedApprovalTxIndex))

  const isApprovalTxPending = useMemo(
    () => isApprovalPending || (isApprovalSuccess && approvalTx?.status !== TxStatus.Confirmed),
    [approvalTx?.status, isApprovalPending, isApprovalSuccess],
  )

  const isApprovalTxSuccess = useMemo(
    () => isApprovalSuccess && approvalTx?.status === TxStatus.Confirmed,
    [approvalTx?.status, isApprovalSuccess],
  )

  return {
    isApprovalRequired,
    isLoading: isRouterContractAddressLoading || isAllowanceDataLoading,
    approve,
    approveAsync,
    isApprovalTxPending,
    isApprovalIdle,
    isApprovalSuccess,
    isApprovalTxSuccess,
  }
}
