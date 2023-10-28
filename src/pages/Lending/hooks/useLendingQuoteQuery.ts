import { type AssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { useWallet } from 'hooks/useWallet/useWallet'
import { toBaseUnit } from 'lib/math'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { getMaybeThorchainLendingOpenQuote } from 'state/slices/opportunitiesSlice/resolvers/thorchainLending/utils'
import {
  BASE_BPS_POINTS,
  fromThorBaseUnit,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import {
  selectFirstAccountIdByChainId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UseLendingQuoteQueryProps = {
  collateralAssetId: AssetId
  borrowAssetId: AssetId
  depositAmountCryptoPrecision: string
}
export const useLendingQuoteQuery = ({
  collateralAssetId,
  borrowAssetId,
  depositAmountCryptoPrecision,
}: UseLendingQuoteQueryProps) => {
  const [borrowAssetReceiveAddress, setBorrowAssetReceiveAddress] = useState<string | null>(null)

  const wallet = useWallet().state.wallet
  // TODO(gomes): programmatic
  const accountId =
    useAppSelector(state =>
      selectFirstAccountIdByChainId(state, fromAssetId(collateralAssetId).chainId),
    ) ?? ''

  // TODO(gomes): programmatic
  const destinationAccountId =
    useAppSelector(state =>
      selectFirstAccountIdByChainId(state, fromAssetId(borrowAssetId).chainId),
    ) ?? ''
  const destinationAccountMetadataFilter = useMemo(
    () => ({ accountId: destinationAccountId }),
    [destinationAccountId],
  )
  const destinationAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, destinationAccountMetadataFilter),
  )
  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))
  const collateralAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, collateralAssetId),
  )

  const borrowAsset = useAppSelector(state => selectAssetById(state, borrowAssetId))
  const borrowAssetMarketData = useAppSelector(state => selectMarketDataById(state, borrowAssetId))

  const getBorrowAssetReceiveAddress = useCallback(async () => {
    if (!wallet || !destinationAccountId || !destinationAccountMetadata || !borrowAsset) return

    const deviceId = await wallet.getDeviceID()
    const pubKey = isLedger(wallet) ? fromAccountId(destinationAccountId).account : undefined

    return getReceiveAddress({
      asset: borrowAsset,
      wallet,
      deviceId,
      accountMetadata: destinationAccountMetadata,
      pubKey,
    })
  }, [borrowAsset, destinationAccountId, destinationAccountMetadata, wallet])

  useEffect(() => {
    ;(async () => {
      const address = await getBorrowAssetReceiveAddress()
      if (address) setBorrowAssetReceiveAddress(address)
    })()
  }, [getBorrowAssetReceiveAddress])

  const lendingQuoteQueryKey: [
    string,
    UseLendingQuoteQueryProps & { borrowAssetReceiveAddress: string },
    // TODO(gomes): improve this - most likely by memoizing the useDebounce() call. This should only referentially change if this invalidates by shallow comparison
  ] = useDebounce(
    () => [
      'lendingQuoteQuery',
      { borrowAssetReceiveAddress, collateralAssetId, borrowAssetId, depositAmountCryptoPrecision },
    ],
    500,
  )

  // Fetch the current lending position data
  // TODO(gomes): either move me up so we can use this for the borrowed amount, or even better, create a queries namespace
  // for reusable queries and move me there
  const query = useQuery({
    queryKey: lendingQuoteQueryKey,
    queryFn: async ({ queryKey }) => {
      const [
        ,
        {
          borrowAssetReceiveAddress,
          collateralAssetId,
          borrowAssetId,
          depositAmountCryptoPrecision,
        },
      ] = queryKey
      const position = await getMaybeThorchainLendingOpenQuote({
        receiveAssetId: borrowAssetId,
        collateralAssetId,
        collateralAmountCryptoBaseUnit: toBaseUnit(
          depositAmountCryptoPrecision,
          collateralAsset?.precision ?? 0, // actually always defined at runtime, see "enabled" option
        ),
        receiveAssetAddress: borrowAssetReceiveAddress ?? '', // actually always defined at runtime, see "enabled" option
      })
      return position
    },
    // TODO(gomes): now that we've extracted this to a hook, we might use some memoization pattern on the selectFn
    // since it is run every render, regardless of data fetching happening.
    // This may not be needed for such small logic, but we should keep this in mind for future hooks
    select: data => {
      // TODO(gomes): error handling
      const quote = data.unwrap()

      const quoteCollateralAmountCryptoPrecision = fromThorBaseUnit(
        quote.expected_collateral_deposited,
      ).toString()
      const quoteCollateralAmountFiatUserCurrency = fromThorBaseUnit(
        quote.expected_collateral_deposited,
      )
        .times(collateralAssetMarketData.price)
        .toString()
      const quoteDebtAmountUsd = fromThorBaseUnit(quote.expected_debt_issued).toString()
      const quoteBorrowedAmountCryptoPrecision = fromThorBaseUnit(
        quote.expected_amount_out,
      ).toString()
      const quoteBorrowedAmountUserCurrency = bnOrZero(quoteBorrowedAmountCryptoPrecision)
        .times(borrowAssetMarketData?.price ?? 0)
        .toString()

      const quoteCollateralizationRatioPercent = bnOrZero(
        quote.expected_collateralization_ratio,
      ).div(100)
      const quoteCollateralizationRatioPercentDecimal = bnOrZero(quoteCollateralizationRatioPercent)
        .div(100)
        .toString()
      const quoteSlippagePercentageDecimal = bnOrZero(quote.fees.slippage_bps)
        .div(BASE_BPS_POINTS)
        .toString()
      const quoteTotalFeesFiatUserCurrency = fromThorBaseUnit(quote.fees.total)
        .times(borrowAssetMarketData?.price ?? 0)
        .toString()
      // getting the amount before all fees, so we can determine the slippage denominated in receive asset
      const borrowAmountBeforeFeesCryptoPrecision = fromThorBaseUnit(
        bnOrZero(quote.expected_amount_out).plus(quote.fees.total),
      )
      const quoteSlippageBorrowedAssetCryptoPrecision = borrowAmountBeforeFeesCryptoPrecision
        .times(quoteSlippagePercentageDecimal)
        .toString()

      const quoteInboundAddress = quote.inbound_address
      const quoteMemo = quote.memo

      return {
        quoteCollateralAmountCryptoPrecision,
        quoteCollateralAmountFiatUserCurrency,
        quoteDebtAmountUsd,
        quoteBorrowedAmountCryptoPrecision,
        quoteBorrowedAmountUserCurrency,
        quoteCollateralizationRatioPercentDecimal,
        quoteSlippageBorrowedAssetCryptoPrecision,
        quoteTotalFeesFiatUserCurrency,
        quoteInboundAddress,
        quoteMemo,
      }
    },
    enabled: Boolean(
      bnOrZero(depositAmountCryptoPrecision).gt(0) &&
        accountId &&
        destinationAccountMetadata &&
        collateralAsset &&
        borrowAssetReceiveAddress &&
        collateralAssetMarketData.price !== '0' &&
        depositAmountCryptoPrecision !== '0',
    ),
  })

  return query
}
