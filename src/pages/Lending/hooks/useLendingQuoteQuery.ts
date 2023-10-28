import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { toBaseUnit } from 'lib/math'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { getMaybeThorchainLendingOpenQuote } from 'state/slices/opportunitiesSlice/resolvers/thorchainLending/utils'
import { fromThorBaseUnit } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import {
  selectFirstAccountIdByChainId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UseLendingQuoteQueryProps = {
  borrowAssetReceiveAddress: string | null
  collateralAssetId: AssetId
  borrowAssetId: AssetId
  depositAmountCryptoPrecision: string
}
export const useLendingQuoteQuery = ({
  borrowAssetReceiveAddress,
  collateralAssetId,
  borrowAssetId,
  depositAmountCryptoPrecision,
}: UseLendingQuoteQueryProps) => {
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
  const lendingQuoteQueryKey: [string, UseLendingQuoteQueryProps] = useDebounce(
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

      return {
        quoteCollateralAmountCryptoPrecision,
        quoteCollateralAmountFiatUserCurrency,
        quoteDebtAmountUsd,
      }
    },
    enabled: Boolean(
      bnOrZero(depositAmountCryptoPrecision).gt(0) &&
        accountId &&
        destinationAccountMetadata &&
        collateralAsset &&
        borrowAssetReceiveAddress &&
        collateralAssetMarketData.price !== '0',
    ),
  })

  return query
}
