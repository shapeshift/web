import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, tronChainId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { maxUint256 } from 'viem'

import { useEvmFees } from './useEvmFees'

import { assertGetTronChainAdapter, assertUnreachable } from '@/lib/utils'
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

  // For TRON, estimate approval fees directly
  const tronFeesResult = useQuery({
    queryKey: ['tronApprovalFees', assetId, spender, from],
    queryFn: async () => {
      if (!assetId || !to || !from || !chainId) {
        throw new Error('Missing required parameters for TRON fee estimation')
      }

      const adapter = assertGetTronChainAdapter(chainId)

      // Estimate fees for approval transaction
      const feeData = await adapter.getFeeData({
        to,
        value: '0',
        sendMax: false,
      })

      return {
        networkFeeCryptoBaseUnit: feeData.fast.txFee,
      }
    },
    enabled: Boolean(enabled && chainId === tronChainId && assetId && to && from),
    refetchInterval: isRefetchEnabled ? 15_000 : false,
  })

  const evmFeesResult = useEvmFees({
    to,
    from,
    value: '0',
    chainId,
    data: approveContractData,
    enabled: Boolean(enabled && chainId !== tronChainId),
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
