import type { AccountId } from '@shapeshiftoss/caip'
import { type AssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { MarketData } from '@shapeshiftoss/types'
import type { QueryObserverOptions } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import memoize from 'lodash/memoize'
import { useMemo } from 'react'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { BigNumber, bn } from 'lib/bignumber/bignumber'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import { BASE_BPS_POINTS } from 'lib/utils/thorchain/constants'
import { getMaybeThorchainLendingCloseQuote } from 'lib/utils/thorchain/lending'
import type {
  LendingQuoteClose,
  LendingWithdrawQuoteResponseSuccess,
} from 'lib/utils/thorchain/lending/types'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import {
  selectMarketDataById,
  selectUserCurrencyToUsdRate,
} from 'state/slices/marketDataSlice/selectors'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

import { useLendingPositionData } from './useLendingPositionData'

type UseLendingQuoteCloseQueryProps = {
  repaymentAssetId: AssetId
  repaymentAccountId: AccountId
  collateralAccountId: AccountId
  collateralAssetId: AssetId
  repaymentPercent: number
}

const selectLendingCloseQueryData = memoize(
  ({
    data,
    collateralAssetMarketData,
    repaymentAssetMarketData,
    repaymentPercent,
  }: {
    data: LendingWithdrawQuoteResponseSuccess
    collateralAssetMarketData: MarketData
    repaymentAssetMarketData: MarketData
    repaymentPercent: number
  }): LendingQuoteClose => {
    const quote = data
    const userCurrencyToUsdRate = selectUserCurrencyToUsdRate(store.getState())

    const quoteLoanCollateralDecreaseCryptoPrecision = fromThorBaseUnit(
      quote.expected_collateral_withdrawn,
    ).toString()
    const quoteLoanCollateralDecreaseFiatUserCurrency = fromThorBaseUnit(
      quote.expected_collateral_withdrawn,
    )
      .times(collateralAssetMarketData.price)
      .toString()
    const quoteLoanCollateralDecreaseFiatUsd = bn(quoteLoanCollateralDecreaseFiatUserCurrency)
      .div(userCurrencyToUsdRate)
      .toString()
    const quoteDebtRepaidAmountUserCurrency = fromThorBaseUnit(quote.expected_debt_repaid)
      .times(userCurrencyToUsdRate)
      .toString()
    const quoteDebtRepaidAmountUsd = bn(quoteDebtRepaidAmountUserCurrency)
      .div(userCurrencyToUsdRate)
      .toString()
    const quoteWithdrawnAmountAfterFeesCryptoPrecision = fromThorBaseUnit(
      quote.expected_amount_out,
    ).toString()
    const quoteWithdrawnAmountAfterFeesUserCurrency = bnOrZero(
      quoteWithdrawnAmountAfterFeesCryptoPrecision,
    )
      .times(collateralAssetMarketData?.price ?? 0)
      .toString()

    const quoteSlippagePercentageDecimal = bnOrZero(quote.fees.slippage_bps)
      .div(BASE_BPS_POINTS)
      .toString()
    const quoteTotalFeesFiatUserCurrency = fromThorBaseUnit(quote.fees.total)
      .times(collateralAssetMarketData?.price ?? 0)
      .toString()
    const quoteTotalFeesFiatUsd = bn(quoteTotalFeesFiatUserCurrency)
      .div(userCurrencyToUsdRate)
      .toString()

    const withdrawnAmountBeforeFeesCryptoPrecision = fromThorBaseUnit(
      bnOrZero(quote.expected_amount_out).plus(quote.fees.total),
    )
    const quoteSlippageWithdrawndAssetCryptoPrecision = withdrawnAmountBeforeFeesCryptoPrecision
      .times(quoteSlippagePercentageDecimal)
      .toString()

    const quoteInboundAddress = quote.inbound_address
    const quoteMemo = quote.memo
    const quoteExpiry = quote.expiry
    const quoteOutboundDelayMs = bnOrZero(quote.outbound_delay_seconds).times(1000).toNumber()
    const quoteInboundConfirmationMs = bnOrZero(quote.inbound_confirmation_seconds)
      .times(1000)
      .toNumber()
    // Sane number for total time, in case the outbound is 0 seconds and the inbound is also fast,
    // so that users don't end up waiting 30s before the seeminngly "complete" Tx as far as progress bar goes, and actual confirmed state
    const quoteTotalTimeMs = BigNumber.max(
      120_000,
      bn(quoteOutboundDelayMs).plus(quoteInboundConfirmationMs),
    ).toNumber()

    const repaymentAmountCryptoPrecision = fromThorBaseUnit(quote.expected_amount_in).toString()
    const repaymentAmountFiatUserCurrency = fromThorBaseUnit(data.expected_amount_in)
      .times(repaymentAssetMarketData.price)
      .toString()
    const repaymentAmountFiatUsd = bn(repaymentAmountFiatUserCurrency)
      .times(userCurrencyToUsdRate)
      .toFixed()

    return {
      quoteLoanCollateralDecreaseCryptoPrecision,
      quoteLoanCollateralDecreaseFiatUserCurrency,
      quoteLoanCollateralDecreaseFiatUsd,
      quoteDebtRepaidAmountUserCurrency,
      quoteDebtRepaidAmountUsd,
      quoteWithdrawnAmountAfterFeesCryptoPrecision,
      quoteWithdrawnAmountAfterFeesUserCurrency,
      quoteSlippageWithdrawndAssetCryptoPrecision,
      quoteTotalFeesFiatUserCurrency,
      quoteTotalFeesFiatUsd,
      quoteInboundAddress,
      quoteMemo,
      quoteOutboundDelayMs,
      quoteInboundConfirmationMs,
      quoteTotalTimeMs,
      quoteExpiry,
      repaymentAmountCryptoPrecision,
      repaymentAmountFiatUsd,
      repaymentAmountFiatUserCurrency,
      repaymentPercent,
    }
  },
)

export const useLendingQuoteCloseQuery = ({
  repaymentAssetId: _repaymentAssetId,
  collateralAssetId: _collateralAssetId,
  repaymentPercent: _repaymentPercent,
  repaymentAccountId: _repaymentAccountId,
  collateralAccountId: _collateralAccountId,
}: UseLendingQuoteCloseQueryProps & QueryObserverOptions) => {
  const { data: lendingPositionData } = useLendingPositionData({
    assetId: _collateralAssetId,
    accountId: _collateralAccountId,
  })

  const lendingQuoteCloseQueryKey = useDebounce(
    () => [
      'lendingQuoteCloseQuery',
      {
        collateralAssetAddress: lendingPositionData?.address ?? '',
        repaymentAssetId: _repaymentAssetId,
        repaymentAccountId: _repaymentAccountId,
        collateralAssetId: _collateralAssetId,
        collateralAccountId: _collateralAccountId,
        repaymentPercent: _repaymentPercent,
      },
    ],
    500,
  ) as unknown as [string, UseLendingQuoteCloseQueryProps & { collateralAssetAddress: string }]

  const {
    repaymentAssetId,
    repaymentAccountId,
    collateralAssetId,
    collateralAccountId,
    repaymentPercent,
  } = useMemo(
    () => ({
      repaymentAssetId: lendingQuoteCloseQueryKey[1].repaymentAssetId,
      repaymentAccountId: lendingQuoteCloseQueryKey[1].repaymentAccountId,
      collateralAssetId: lendingQuoteCloseQueryKey[1].collateralAssetId,
      collateralAccountId: lendingQuoteCloseQueryKey[1].collateralAccountId,
      repaymentPercent: lendingQuoteCloseQueryKey[1].repaymentPercent,
    }),
    [lendingQuoteCloseQueryKey],
  )

  const collateralAccountMetadataFilter = useMemo(
    () => ({ accountId: collateralAccountId }),
    [collateralAccountId],
  )
  const collateralAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, collateralAccountMetadataFilter),
  )
  const repaymentAsset = useAppSelector(state => selectAssetById(state, repaymentAssetId))
  const repaymentAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, repaymentAssetId),
  )

  const collateralAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, collateralAssetId),
  )

  const query = useQuery({
    // Go stale instantly, and clear garbage collect instantly, as we absolutely want to have the freshest data
    // because of market-data discrepancies
    staleTime: 0,
    gcTime: 0,
    // Safety first, even if there are already active consumers, remounts should trigger refetches
    refetchOnMount: true,
    queryKey: lendingQuoteCloseQueryKey,
    queryFn: async ({ queryKey }) => {
      const [, { collateralAssetAddress, repaymentAssetId, collateralAssetId }] = queryKey
      const quote = await getMaybeThorchainLendingCloseQuote({
        repaymentAssetId,
        collateralAssetId,
        repaymentPercent,
        collateralAssetAddress, // actually always defined at runtime, see "enabled" option
      })

      if (quote.isErr()) throw new Error(quote.unwrapErr())
      return quote.unwrap()
    },
    // This avoids retrying errored queries - i.e smaller amounts, or repayment locked will error
    // Failed queries go stale and don't honor "staleTime", which meaans failed queries would trigger a THOR daemon fetch from all consumers
    // vs. the failed query being considered fresh
    retry: false,
    select: data =>
      selectLendingCloseQueryData({
        data,
        collateralAssetMarketData,
        repaymentAssetMarketData,
        repaymentPercent,
      }),
    // Do not refetch if consumers explicitly set enabled to false
    // They do so because the query should never run in the reactive react realm, but only programmatically with the refetch function
    refetchIntervalInBackground: true,
    refetchInterval: 20_000,
    enabled: Boolean(
      lendingPositionData?.address &&
        bnOrZero(repaymentPercent).gt(0) &&
        repaymentAccountId &&
        collateralAssetId &&
        collateralAccountMetadata &&
        repaymentAsset &&
        bnOrZero(repaymentPercent).gt(0) &&
        bnOrZero(repaymentPercent).gt(0),
    ),
  })

  return query
}
