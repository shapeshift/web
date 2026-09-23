import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, tronChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { maxUint256 } from 'viem'

import { useEvmFees } from './useEvmFees'

import { assertUnreachable } from '@/lib/utils'
import { getApproveContractData } from '@/lib/utils/evm'
import { getTronApproveContractData } from '@/lib/utils/tron'
import { reactQueries } from '@/react-queries'

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

  const approvalAmountCryptoBaseUnit = useMemo(
    () =>
      amountCryptoBaseUnit
        ? getApprovalAmountCryptoBaseUnit(amountCryptoBaseUnit, allowanceType)
        : undefined,
    [allowanceType, amountCryptoBaseUnit],
  )

  const approveContractData = useMemo(() => {
    if (!approvalAmountCryptoBaseUnit || !spender || !to || !chainId || !enabled) return

    if (chainId === tronChainId) {
      return getTronApproveContractData({
        spender,
        amountCryptoBaseUnit: approvalAmountCryptoBaseUnit,
      })
    }

    if (isEvmChainId(chainId)) {
      return getApproveContractData({ approvalAmountCryptoBaseUnit, chainId, spender, to })
    }
  }, [approvalAmountCryptoBaseUnit, chainId, enabled, spender, to])

  const tronFeesResult = useQuery({
    ...reactQueries.common.tronFees({ chainId, to, from, value: '0', data: approveContractData }),
    enabled: Boolean(enabled && chainId === tronChainId && approveContractData && to && from),
    refetchInterval: isRefetchEnabled ? 15_000 : false,
  })

  const evmFeesResult = useEvmFees({
    to,
    from,
    value: '0',
    chainId,
    data: approveContractData,
    enabled: Boolean(enabled && chainId && isEvmChainId(chainId)),
    refetchIntervalInBackground: isRefetchEnabled ? true : false,
    refetchInterval: isRefetchEnabled ? 15_000 : false,
  })

  // Return unified interface - TRON or EVM fees
  const feesResult = chainId === tronChainId ? tronFeesResult : evmFeesResult

  return {
    approveContractData,
    evmFeesResult: feesResult,
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
