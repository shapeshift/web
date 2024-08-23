import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { MAX_ALLOWANCE } from '@shapeshiftoss/swapper/src/swappers/utils/constants'
import { useMemo } from 'react'
import { assertUnreachable } from 'lib/utils'
import { getApproveContractData } from 'lib/utils/evm'

import { useEvmFees } from './useEvmFees'
import { useIsApprovalRequired } from './useIsApprovalRequired'

export enum AllowanceType {
  Exact,
  Unlimited,
  Reset,
}

type UseApprovalFeesInput = {
  assetId: AssetId
  from: string | undefined
  spender: string
  amountCryptoBaseUnit: string
  allowanceType: AllowanceType
  enabled: boolean
}

export const useApprovalFees = ({
  assetId,
  amountCryptoBaseUnit,
  from,
  allowanceType,
  spender,
  enabled,
}: UseApprovalFeesInput) => {
  const { assetReference: to, chainId } = useMemo(() => {
    return fromAssetId(assetId)
  }, [assetId])

  const { allowanceCryptoBaseUnitResult, isApprovalRequired } = useIsApprovalRequired({
    amountCryptoBaseUnit,
    assetId,
    from,
    spender,
  })

  const approveContractData = useMemo(() => {
    if (!amountCryptoBaseUnit || !spender) return

    return getApproveContractData({
      approvalAmountCryptoBaseUnit: getApprovalAmountCryptoBaseUnit(
        amountCryptoBaseUnit,
        allowanceType,
      ),
      chainId,
      spender,
      to,
    })
  }, [allowanceType, amountCryptoBaseUnit, chainId, spender, to])

  const evmFeesResult = useEvmFees({
    to,
    from,
    value: '0',
    chainId,
    data: approveContractData,
    enabled: Boolean(isApprovalRequired && enabled),
    refetchIntervalInBackground: true,
    refetchInterval: isApprovalRequired ? 15_000 : false,
  })

  return {
    allowanceCryptoBaseUnitResult,
    approveContractData,
    evmFeesResult,
    isApprovalRequired,
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
      return MAX_ALLOWANCE
    case AllowanceType.Reset:
      return '0'
    default:
      assertUnreachable(allowanceType)
  }
}
