import { type AccountId, type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import type { Asset, KnownChainIds } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { toHex } from 'viem'
import { estimateFees } from 'components/Modals/Send/utils'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { getSupportedEvmChainIds } from 'lib/utils/evm'
import type { LendingQuoteClose, LendingQuoteOpen } from 'lib/utils/thorchain/lending/types'
import type {
  LpConfirmedDepositQuote,
  LpConfirmedWithdrawalQuote,
} from 'lib/utils/thorchain/lp/types'
import { selectFeeAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UseQuoteEstimatedFeesProps = {
  enabled?: boolean
  collateralAssetId: AssetId
} & (
  | {
      confirmedQuote: LendingQuoteOpen | null
      collateralAccountId: AccountId
      depositAmountCryptoPrecision: string
      repaymentAccountId?: never
      repaymentAsset?: never
      repaymentAmountCryptoPrecision?: never
    }
  | {
      confirmedQuote: LendingQuoteClose | null
      collateralAccountId: AccountId
      depositAmountCryptoPrecision?: never
      repaymentAccountId: AccountId
      repaymentAsset: Asset | null
      repaymentAmountCryptoPrecision?: never
    }
  | {
      confirmedQuote: LpConfirmedDepositQuote | null
      // Technically not a collateral, but this avoids weird branching, ternaries or ?? checks for now
      collateralAccountId: AccountId
      depositAmountCryptoPrecision: string
      repaymentAccountId?: never
      repaymentAsset?: never
      repaymentAmountCryptoPrecision?: never
    }
  | {
      confirmedQuote: LpConfirmedWithdrawalQuote | null
      // Technically not a collateral, but this avoids weird branching, ternaries or ?? checks for now
      collateralAccountId: AccountId
      depositAmountCryptoPrecision?: never
      repaymentAccountId: AccountId
      repaymentAsset: Asset | null
      repaymentAmountCryptoPrecision: string | undefined
    }
)

export const useQuoteEstimatedFeesQuery = ({
  collateralAssetId,
  collateralAccountId,
  depositAmountCryptoPrecision,
  repaymentAccountId,
  repaymentAsset,
  confirmedQuote,
  repaymentAmountCryptoPrecision: _repaymentAmountCryptoPrecision,
  enabled: _enabled = true,
}: UseQuoteEstimatedFeesProps) => {
  const repaymentAmountCryptoPrecision = useMemo(
    () =>
      _repaymentAmountCryptoPrecision ??
      (confirmedQuote as LendingQuoteClose)?.repaymentAmountCryptoPrecision,
    [_repaymentAmountCryptoPrecision, confirmedQuote],
  )
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, collateralAssetId))
  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, collateralAssetId),
  )
  const estimateFeesArgs = useMemo(() => {
    const supportedEvmChainIds = getSupportedEvmChainIds()
    const amountCryptoPrecision =
      depositAmountCryptoPrecision ?? repaymentAmountCryptoPrecision ?? '0'
    const assetId = repaymentAsset?.assetId ?? collateralAssetId
    const quoteMemo =
      confirmedQuote && 'quoteMemo' in confirmedQuote ? confirmedQuote.quoteMemo : ''
    const memo =
      assetId && supportedEvmChainIds.includes(fromAssetId(assetId).chainId as KnownChainIds)
        ? toHex(quoteMemo)
        : quoteMemo
    const to =
      confirmedQuote && 'quoteInboundAddress' in confirmedQuote
        ? confirmedQuote.quoteInboundAddress
        : ''
    const accountId = repaymentAccountId ?? collateralAccountId

    return {
      amountCryptoPrecision,
      assetId,
      memo,
      to,
      accountId,
      sendMax: false,
      contractAddress: undefined,
    } as const
  }, [
    depositAmountCryptoPrecision,
    repaymentAmountCryptoPrecision,
    repaymentAsset?.assetId,
    collateralAssetId,
    confirmedQuote,
    repaymentAccountId,
    collateralAccountId,
  ])

  // TODO(gomes): this is wrong, we should use a proper generated query for this
  const quoteEstimatedFeesQueryKey = useMemo(
    () => ['thorchainLendingQuoteEstimatedFees', estimateFeesArgs],
    [estimateFeesArgs],
  )

  const enabled = useMemo(
    () =>
      Boolean(
        _enabled &&
          feeAsset &&
          confirmedQuote &&
          (collateralAssetId || repaymentAsset) &&
          (bnOrZero(depositAmountCryptoPrecision).gt(0) || !!repaymentAmountCryptoPrecision),
      ),
    [
      _enabled,
      collateralAssetId,
      confirmedQuote,
      depositAmountCryptoPrecision,
      feeAsset,
      repaymentAmountCryptoPrecision,
      repaymentAsset,
    ],
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
    enabled,
    retry: false,
  })

  return useQuoteEstimatedFeesQuery
}
