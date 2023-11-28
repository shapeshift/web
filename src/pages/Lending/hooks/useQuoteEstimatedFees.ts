import { type AccountId, type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { utils } from 'ethers'
import { useMemo } from 'react'
import { estimateFees } from 'components/Modals/Send/utils'
import { getSupportedEvmChainIds } from 'hooks/useEvm/useEvm'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectFeeAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useLendingQuoteCloseQuery } from './useLendingCloseQuery'
import { useLendingQuoteOpenQuery } from './useLendingQuoteQuery'

type UseQuoteEstimatedFeesProps = {
  collateralAssetId: AssetId
} & (
  | {
      borrowAssetId: AssetId
      borrowAccountId: AccountId
      collateralAccountId: AccountId
      depositAmountCryptoPrecision: string
      repaymentAccountId?: never
      repaymentAsset?: never
      repaymentPercent?: never
    }
  | {
      borrowAssetId?: never
      borrowAccountId?: never
      collateralAccountId: AccountId
      depositAmountCryptoPrecision?: never
      repaymentAccountId: AccountId
      repaymentAsset: Asset | null
      repaymentPercent: number
    }
)

export const useQuoteEstimatedFeesQuery = ({
  collateralAssetId,
  collateralAccountId,
  borrowAccountId,
  borrowAssetId,
  depositAmountCryptoPrecision,
  repaymentAccountId,
  repaymentAsset,
  repaymentPercent,
}: UseQuoteEstimatedFeesProps) => {
  const useLendingQuoteQueryArgs = useMemo(
    () => ({
      collateralAssetId,
      collateralAccountId,
      borrowAccountId: borrowAccountId ?? '',
      borrowAssetId: borrowAssetId ?? '',
      depositAmountCryptoPrecision: depositAmountCryptoPrecision ?? '0',
    }),
    [
      collateralAssetId,
      collateralAccountId,
      borrowAccountId,
      borrowAssetId,
      depositAmountCryptoPrecision,
    ],
  )
  const { data: lendingQuoteData } = useLendingQuoteOpenQuery(useLendingQuoteQueryArgs)

  const useLendingQuoteCloseQueryArgs = useMemo(
    () => ({
      collateralAssetId,
      repaymentAssetId: repaymentAsset?.assetId ?? '',
      repaymentPercent: Number(repaymentPercent),
      repaymentAccountId: repaymentAccountId ?? '',
      collateralAccountId: collateralAccountId ?? '',
    }),
    [
      collateralAccountId,
      collateralAssetId,
      repaymentAccountId,
      repaymentAsset?.assetId,
      repaymentPercent,
    ],
  )

  const { data: lendingQuoteCloseData } = useLendingQuoteCloseQuery(useLendingQuoteCloseQueryArgs)

  const feeAsset = useAppSelector(state => selectFeeAssetById(state, collateralAssetId))
  const feeAssetMarketData = useAppSelector(state => selectMarketDataById(state, collateralAssetId))
  const estimateFeesArgs = useMemo(() => {
    const supportedEvmChainIds = getSupportedEvmChainIds()
    const cryptoAmount =
      depositAmountCryptoPrecision ?? lendingQuoteCloseData?.repaymentAmountCryptoPrecision ?? '0'
    const assetId = repaymentAsset?.assetId ?? collateralAssetId
    const quoteMemo = lendingQuoteCloseData?.quoteMemo ?? lendingQuoteData?.quoteMemo ?? ''
    const memo = supportedEvmChainIds.includes(fromAssetId(assetId).chainId)
      ? utils.hexlify(utils.toUtf8Bytes(quoteMemo))
      : quoteMemo
    const to =
      lendingQuoteCloseData?.quoteInboundAddress ?? lendingQuoteData?.quoteInboundAddress ?? ''
    const accountId = repaymentAccountId ?? collateralAccountId

    return {
      cryptoAmount,
      assetId,
      memo,
      to,
      accountId,
      sendMax: false,
      contractAddress: undefined,
    } as const
  }, [
    collateralAccountId,
    collateralAssetId,
    depositAmountCryptoPrecision,
    lendingQuoteCloseData?.quoteInboundAddress,
    lendingQuoteCloseData?.quoteMemo,
    lendingQuoteCloseData?.repaymentAmountCryptoPrecision,
    lendingQuoteData?.quoteInboundAddress,
    lendingQuoteData?.quoteMemo,
    repaymentAccountId,
    repaymentAsset?.assetId,
  ])

  const quoteEstimatedFeesQueryKey = useMemo(
    () => ['thorchainLendingQuoteEstimatedFees', estimateFeesArgs],
    [estimateFeesArgs],
  )

  const useQuoteEstimatedFeesQuery = useQuery({
    queryKey: quoteEstimatedFeesQueryKey,
    queryFn: async () => {
      const estimatedFees = await estimateFees(estimateFeesArgs)
      const txFeeFiat = bnOrZero(estimatedFees.fast.txFee)
        .div(bn(10).pow(feeAsset!.precision)) // actually defined at runtime, see "enabled" below
        .times(feeAssetMarketData.price)
        .toString()
      return { estimatedFees, txFeeFiat, txFeeCryptoBaseUnit: estimatedFees.fast.txFee }
    },
    enabled: Boolean(feeAsset && (lendingQuoteData || lendingQuoteCloseData)),
    retry: false,
  })

  return useQuoteEstimatedFeesQuery
}
