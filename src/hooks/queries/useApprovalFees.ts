import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { maxUint256 } from 'viem'

import { useEvmFees } from './useEvmFees'

import { assertUnreachable } from '@/lib/utils'
import { getApproveContractData } from '@/lib/utils/evm'

export enum AllowanceType {
  Exact,
  Unlimited,
  Reset,
}

type UseApprovalFeesInput = {
  assetId: AssetId | undefined
  from: string | undefined
  spender: string
  amountCryptoBaseUnit: string
  allowanceType: AllowanceType
  enabled: boolean
  isRefetchEnabled: boolean
}

export const useApprovalFees = ({
  assetId,
  amountCryptoBaseUnit,
  from,
  allowanceType,
  spender,
  enabled,
  isRefetchEnabled,
}: UseApprovalFeesInput) => {
  const { assetReference: to, chainId } = useMemo(() => {
    if (!assetId) return { assetReference: undefined, chainId: undefined }

    return fromAssetId(assetId)
  }, [assetId])

  const approveContractData = useMemo(() => {
    if (!amountCryptoBaseUnit || !spender || !to || !chainId || !enabled) return

    return getApproveContractData({
      approvalAmountCryptoBaseUnit: getApprovalAmountCryptoBaseUnit(
        amountCryptoBaseUnit,
        allowanceType,
      ),
      chainId,
      spender,
      to,
    })
  }, [allowanceType, amountCryptoBaseUnit, chainId, enabled, spender, to])

  const evmFeesResult = useEvmFees({
    to,
    from,
    value: '0',
    chainId,
    data: approveContractData,
    enabled: Boolean(enabled),
    refetchIntervalInBackground: isRefetchEnabled ? true : false,
    refetchInterval: isRefetchEnabled ? 15_000 : false,
  })

  return {
    approveContractData,
    evmFeesResult,
  }
}

export const getApprovalAmountCryptoBaseUnit = (
  amountCryptoBaseUnit: string,
  allowanceType: AllowanceType,
) => {
  switch (allowanceType) {
    case AllowanceType.Exact:
      return amountCryptoBaseUnit
    case AllowanceType.Unlimited:
      return maxUint256.toString()
    case AllowanceType.Reset:
      return '0'
    default:
      assertUnreachable(allowanceType)
  }
}
