import { type AccountId, type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'
import { utils } from 'ethers'
import { useMemo } from 'react'
import { estimateFees } from 'components/Modals/Send/utils'
import { getSupportedEvmChainIds } from 'hooks/useEvm/useEvm'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { LendingQuoteClose, LendingQuoteOpen } from 'lib/utils/thorchain/lending/types'
import { selectFeeAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UseQuoteEstimatedFeesProps = {
  collateralAssetId: AssetId
} & (
  | {
      confirmedQuote: LendingQuoteOpen | null
      collateralAccountId: AccountId
      depositAmountCryptoPrecision: string
      repaymentAccountId?: never
      repaymentAsset?: never
    }
  | {
      confirmedQuote: LendingQuoteClose | null
      collateralAccountId: AccountId
      depositAmountCryptoPrecision?: never
      repaymentAccountId: AccountId
      repaymentAsset: Asset | null
    }
)

export const useQuoteEstimatedFeesQuery = ({
  collateralAssetId,
  collateralAccountId,
  depositAmountCryptoPrecision,
  repaymentAccountId,
  repaymentAsset,
  confirmedQuote,
}: UseQuoteEstimatedFeesProps) => {
  const repaymentAmountCryptoPrecision = useMemo(
    () => (confirmedQuote as LendingQuoteClose)?.repaymentAmountCryptoPrecision,
    [confirmedQuote],
  )
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, collateralAssetId))
  const feeAssetMarketData = useAppSelector(state => selectMarketDataById(state, collateralAssetId))
  const estimateFeesArgs = useMemo(() => {
    const supportedEvmChainIds = getSupportedEvmChainIds()
    const cryptoAmount = depositAmountCryptoPrecision ?? repaymentAmountCryptoPrecision ?? '0'
    const assetId = repaymentAsset?.assetId ?? collateralAssetId
    const quoteMemo = confirmedQuote?.quoteMemo ?? confirmedQuote?.quoteMemo ?? ''
    const memo = supportedEvmChainIds.includes(fromAssetId(assetId).chainId)
      ? utils.hexlify(utils.toUtf8Bytes(quoteMemo))
      : quoteMemo
    const to = confirmedQuote?.quoteInboundAddress ?? confirmedQuote?.quoteInboundAddress ?? ''
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
    confirmedQuote?.quoteInboundAddress,
    confirmedQuote?.quoteMemo,
    repaymentAmountCryptoPrecision,
    depositAmountCryptoPrecision,
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
    enabled: Boolean(feeAsset && confirmedQuote),
    retry: false,
  })

  return useQuoteEstimatedFeesQuery
}
