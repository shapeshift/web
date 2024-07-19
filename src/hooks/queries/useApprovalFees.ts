import type { AssetId, FromAssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { MAX_ALLOWANCE } from '@shapeshiftoss/swapper/src/swappers/utils/constants'
import { useMemo } from 'react'
import { getApproveContractData } from 'lib/utils/evm'

import { useEvmFees } from './useEvmFees'
import { useIsApprovalRequired } from './useIsApprovalRequired'

type UseApprovalFeesInput = {
  accountNumber: number
  assetId: AssetId
  from: string
  spender: string
  amountCryptoBaseUnit: string
  isExactAllowance: boolean
}

export const useApprovalFees = ({
  accountNumber,
  assetId,
  amountCryptoBaseUnit,
  from,
  isExactAllowance = false,
  spender,
}: Partial<UseApprovalFeesInput>) => {
  const { assetReference: to, chainId } = useMemo(() => {
    return assetId ? fromAssetId(assetId) : ({} as ReturnType<FromAssetId>)
  }, [assetId])

  const { allowanceQueryResult, isApprovalRequired } = useIsApprovalRequired({
    amountCryptoBaseUnit,
    assetId,
    from,
    spender,
  })

  const approveContractData = useMemo(() => {
    if (!amountCryptoBaseUnit || !chainId || !spender || !to) return

    const approvalAmountCryptoBaseUnit = isExactAllowance ? amountCryptoBaseUnit : MAX_ALLOWANCE

    return getApproveContractData({
      approvalAmountCryptoBaseUnit,
      chainId,
      spender,
      to,
    })
  }, [amountCryptoBaseUnit, chainId, isExactAllowance, spender, to])

  const evmFeesQueryResult = useEvmFees({
    accountNumber,
    to,
    value: '0',
    chainId,
    data: approveContractData,
    enabled: Boolean(isApprovalRequired),
    refetchIntervalInBackground: true,
    refetchInterval: isApprovalRequired ? 15_000 : false,
  })

  return {
    allowanceQueryResult,
    approveContractData,
    evmFeesQueryResult,
    isApprovalRequired,
  }
}
