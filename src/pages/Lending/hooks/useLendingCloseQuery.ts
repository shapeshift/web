import type { AccountId } from '@shapeshiftoss/caip'
import { type AssetId, fromAccountId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { useWallet } from 'hooks/useWallet/useWallet'
import { toBaseUnit } from 'lib/math'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import {
  selectMarketDataById,
  selectUserCurrencyToUsdRate,
} from 'state/slices/marketDataSlice/selectors'
import { getMaybeThorchainLendingCloseQuote } from 'state/slices/opportunitiesSlice/resolvers/thorchainLending/utils'
import {
  BASE_BPS_POINTS,
  fromThorBaseUnit,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useLendingPositionData } from './useLendingPositionData'

type UseLendingQuoteCloseQueryProps = {
  repaymentAssetId: AssetId
  repaymentAccountId: AccountId
  collateralAccountId: AccountId
  collateralAssetId: AssetId
  repaymentPercent: number
}
export const useLendingQuoteCloseQuery = ({
  repaymentAssetId,
  collateralAssetId,
  repaymentPercent: _repaymentPercent,
  repaymentAccountId,
  collateralAccountId,
}: UseLendingQuoteCloseQueryProps) => {
  const repaymentPercent = useMemo(() => {
    const repaymentPercentBn = bnOrZero(_repaymentPercent)
    // 1% buffer in case our market data differs from THOR's, to ensure 100% loan repays are actually 100% repays
    if (!repaymentPercentBn.eq(100)) return _repaymentPercent
    return repaymentPercentBn.plus('1').toNumber()
  }, [_repaymentPercent])

  const [collateralAssetAddress, setCollateralAssetAddress] = useState<string | null>(null)

  const wallet = useWallet().state.wallet

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

  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))
  const collateralAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, collateralAssetId),
  )

  const getCollateralAssetAddress = useCallback(async () => {
    if (!wallet || !collateralAccountId || !collateralAccountMetadata || !collateralAsset) return

    const deviceId = await wallet.getDeviceID()
    const pubKey = isLedger(wallet) ? fromAccountId(collateralAccountId).account : undefined

    return getReceiveAddress({
      asset: collateralAsset,
      wallet,
      deviceId,
      accountMetadata: collateralAccountMetadata,
      pubKey,
    })
  }, [collateralAsset, collateralAccountId, collateralAccountMetadata, wallet])

  useEffect(() => {
    ;(async () => {
      const address = await getCollateralAssetAddress()
      if (address) setCollateralAssetAddress(address)
    })()
  }, [getCollateralAssetAddress])

  const { data: lendingPositionData } = useLendingPositionData({
    assetId: collateralAssetId,
    accountId: collateralAccountId,
  })

  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)

  const debtBalanceUserCurrency = useMemo(() => {
    return bnOrZero(lendingPositionData?.debtBalanceFiatUSD ?? 0)
      .times(userCurrencyToUsdRate)
      .toFixed()
  }, [lendingPositionData?.debtBalanceFiatUSD, userCurrencyToUsdRate])

  const repaymentAmountFiatUserCurrency = useMemo(() => {
    if (!lendingPositionData) return null

    const proratedCollateralFiatUserCurrency = bnOrZero(repaymentPercent)
      .times(debtBalanceUserCurrency)
      .div(100)

    return proratedCollateralFiatUserCurrency.toFixed()
  }, [debtBalanceUserCurrency, lendingPositionData, repaymentPercent])

  const repaymentAmountCryptoPrecision = useMemo(() => {
    if (!repaymentAmountFiatUserCurrency) return null

    return bnOrZero(repaymentAmountFiatUserCurrency).div(repaymentAssetMarketData.price).toFixed()
  }, [repaymentAmountFiatUserCurrency, repaymentAssetMarketData.price])

  const lendingQuoteQueryKey = useDebounce(
    () => [
      'lendingQuoteQuery',
      {
        collateralAssetAddress,
        repaymentAssetId,
        collateralAssetId,
        repaymentPercent,
      },
    ],
    500,
  ) as unknown as [string, UseLendingQuoteCloseQueryProps & { collateralAssetAddress: string }]

  // Fetch the current lending position data
  // TODO(gomes): either move me up so we can use this for the borrowed amount, or even better, create a queries namespace
  // for reusable queries and move me there
  const query = useQuery({
    queryKey: lendingQuoteQueryKey,
    queryFn: async ({ queryKey }) => {
      const [, { collateralAssetAddress, repaymentAssetId, collateralAssetId }] = queryKey
      const position = await getMaybeThorchainLendingCloseQuote({
        repaymentAssetId,
        collateralAssetId,
        repaymentAmountCryptoBaseUnit: toBaseUnit(
          repaymentAmountCryptoPrecision ?? 0, // actually always defined at runtime, see "enabled" option
          repaymentAsset?.precision ?? 0, // actually always defined at runtime, see "enabled" option
        ),
        collateralAssetAddress, // actually always defined at runtime, see "enabled" option
      })

      if (position.isErr()) throw new Error(position.unwrapErr())
      return position.unwrap()
    },
    // TODO(gomes): now that we've extracted this to a hook, we might use some memoization pattern on the selectFn
    // since it is run every render, regardless of data fetching happening.
    // This may not be needed for such small logic, but we should keep this in mind for future hooks
    select: data => {
      const quote = data

      const quoteLoanCollateralDecreaseCryptoPrecision = fromThorBaseUnit(
        quote.expected_collateral_withdrawn,
      ).toString()
      const quoteLoanCollateralDecreaseFiatUserCurrency = fromThorBaseUnit(
        quote.expected_collateral_withdrawn,
      )
        .times(repaymentAssetMarketData.price)
        .toString()
      const quoteDebtRepaidAmountUsd = fromThorBaseUnit(quote.expected_debt_repaid).toString()
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
      const withdrawnAmountBeforeFeesCryptoPrecision = fromThorBaseUnit(
        bnOrZero(quote.expected_amount_out).plus(quote.fees.total),
      )
      const quoteSlippageWithdrawndAssetCryptoPrecision = withdrawnAmountBeforeFeesCryptoPrecision
        .times(quoteSlippagePercentageDecimal)
        .toString()

      const quoteInboundAddress = quote.inbound_address
      const quoteMemo = quote.memo

      return {
        quoteLoanCollateralDecreaseCryptoPrecision,
        quoteLoanCollateralDecreaseFiatUserCurrency,
        quoteDebtRepaidAmountUsd,
        quoteWithdrawnAmountAfterFeesCryptoPrecision,
        quoteWithdrawnAmountAfterFeesUserCurrency,
        quoteSlippageWithdrawndAssetCryptoPrecision,
        quoteTotalFeesFiatUserCurrency,
        quoteInboundAddress,
        quoteMemo,
        repaymentAmountCryptoPrecision,
      }
    },
    enabled: Boolean(
      bnOrZero(repaymentPercent).gt(0) &&
        repaymentAccountId &&
        collateralAssetId &&
        collateralAccountMetadata &&
        repaymentAsset &&
        collateralAssetAddress?.length &&
        repaymentAssetMarketData.price !== '0' &&
        bnOrZero(repaymentPercent).gt(0) &&
        repaymentAmountCryptoPrecision,
    ),
  })

  return query
}
