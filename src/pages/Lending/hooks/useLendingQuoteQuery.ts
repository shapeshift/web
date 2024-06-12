import type { AccountId } from '@shapeshiftoss/caip'
import { type AssetId, fromAccountId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { MarketData } from '@shapeshiftoss/types'
import type { QueryObserverOptions } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import memoize from 'lodash/memoize'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import { BASE_BPS_POINTS } from 'lib/utils/thorchain/constants'
import { getMaybeThorchainLendingOpenQuote } from 'lib/utils/thorchain/lending'
import type {
  LendingDepositQuoteResponseSuccess,
  LendingQuoteOpen,
} from 'lib/utils/thorchain/lending/types'
import { assertAndProcessMemo } from 'lib/utils/thorchain/memo'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import {
  selectMarketDataByAssetIdUserCurrency,
  selectUserCurrencyToUsdRate,
} from 'state/slices/marketDataSlice/selectors'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

type UseLendingQuoteQueryProps = {
  collateralAssetId: AssetId
  borrowAccountId: AccountId
  collateralAccountId: AccountId | null
  borrowAssetId: AssetId
  depositAmountCryptoPrecision: string
}

type UseLendingQuoteQueryKey = UseLendingQuoteQueryProps & { borrowAssetReceiveAddress: string }

const selectLendingQuoteQuery = memoize(
  ({
    data,
    collateralAssetMarketData,
    borrowAssetMarketData,
  }: {
    data: LendingDepositQuoteResponseSuccess
    collateralAssetMarketData: MarketData
    borrowAssetMarketData: MarketData
  }): LendingQuoteOpen => {
    const quote = data
    const userCurrencyToUsdRate = selectUserCurrencyToUsdRate(store.getState())

    const quoteCollateralAmountCryptoPrecision = fromThorBaseUnit(
      quote.expected_collateral_deposited,
    ).toString()
    const quoteCollateralAmountFiatUserCurrency = fromThorBaseUnit(
      quote.expected_collateral_deposited,
    )
      .times(collateralAssetMarketData.price)
      .toString()

    const quoteCollateralAmountFiatUsd = bn(quoteCollateralAmountFiatUserCurrency)
      .div(userCurrencyToUsdRate)
      .toString()
    const quoteDebtAmountUserCurrency = fromThorBaseUnit(quote.expected_debt_issued)
      .times(userCurrencyToUsdRate)
      .toString()
    const quoteDebtAmountUsd = bn(quoteDebtAmountUserCurrency).div(userCurrencyToUsdRate).toString()

    const quoteBorrowedAmountCryptoPrecision = fromThorBaseUnit(
      quote.expected_amount_out,
    ).toString()
    const quoteBorrowedAmountUserCurrency = bnOrZero(quoteBorrowedAmountCryptoPrecision)
      .times(borrowAssetMarketData?.price ?? 0)
      .toString()
    const quoteBorrowedAmountUsd = bn(quoteBorrowedAmountUserCurrency)
      .div(userCurrencyToUsdRate)
      .toString()

    const quoteCollateralizationRatioPercent = bnOrZero(quote.expected_collateralization_ratio).div(
      100,
    )
    const quoteCollateralizationRatioPercentDecimal = bnOrZero(quoteCollateralizationRatioPercent)
      .div(100)
      .toString()
    const quoteSlippagePercentageDecimal = bnOrZero(quote.fees.slippage_bps)
      .div(BASE_BPS_POINTS)
      .toString()
    const quoteTotalFeesFiatUserCurrency = fromThorBaseUnit(quote.fees.total)
      .times(borrowAssetMarketData?.price ?? 0)
      .toString()
    const quoteTotalFeesFiatUsd = bn(quoteTotalFeesFiatUserCurrency)
      .div(userCurrencyToUsdRate)
      .toString()
    // getting the amount before all fees, so we can determine the slippage denominated in receive asset
    const borrowAmountBeforeFeesCryptoPrecision = fromThorBaseUnit(
      bnOrZero(quote.expected_amount_out).plus(quote.fees.total),
    )
    const quoteSlippageBorrowedAssetCryptoPrecision = borrowAmountBeforeFeesCryptoPrecision
      .times(quoteSlippagePercentageDecimal)
      .toString()

    const quoteSlippageBorrowedAssetUsd = bn(quoteSlippageBorrowedAssetCryptoPrecision)
      .times(borrowAssetMarketData?.price ?? 0)
      .div(userCurrencyToUsdRate)
      .toString()

    const quoteInboundAddress = quote.inbound_address
    // TODO: return quote as is once borrow is using useSendThorTx
    const quoteMemo = assertAndProcessMemo(quote.memo)
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

    return {
      quoteCollateralAmountCryptoPrecision,
      quoteCollateralAmountFiatUserCurrency,
      quoteCollateralAmountFiatUsd,
      quoteDebtAmountUserCurrency,
      quoteDebtAmountUsd,
      quoteBorrowedAmountCryptoPrecision,
      quoteBorrowedAmountUserCurrency,
      quoteBorrowedAmountUsd,
      quoteCollateralizationRatioPercentDecimal,
      quoteSlippageBorrowedAssetCryptoPrecision,
      quoteSlippageBorrowedAssetUsd,
      quoteTotalFeesFiatUserCurrency,
      quoteTotalFeesFiatUsd,
      quoteInboundAddress,
      quoteMemo,
      quoteOutboundDelayMs,
      quoteInboundConfirmationMs,
      quoteTotalTimeMs,
      quoteExpiry,
    }
  },
)

export const useLendingQuoteOpenQuery = ({
  collateralAssetId: _collateralAssetId,
  collateralAccountId: _collateralAccountId,
  borrowAccountId: _borrowAccountId,
  borrowAssetId: _borrowAssetId,
  depositAmountCryptoPrecision: _depositAmountCryptoPrecision,
  enabled = true,
}: UseLendingQuoteQueryProps & Pick<QueryObserverOptions, 'enabled'>) => {
  const [_borrowAssetReceiveAddress, setBorrowAssetReceiveAddress] = useState<string | null>(null)

  const wallet = useWallet().state.wallet

  const lendingQuoteQueryKey = useDebounce(
    () => [
      'lendingQuoteQuery',
      {
        borrowAssetReceiveAddress: _borrowAssetReceiveAddress,
        collateralAccountId: _collateralAccountId,
        collateralAssetId: _collateralAssetId,
        borrowAssetId: _borrowAssetId,
        borrowAccountId: _borrowAccountId,
        depositAmountCryptoPrecision: _depositAmountCryptoPrecision,
      },
    ],
    500,
  ) as unknown as [string, UseLendingQuoteQueryKey]

  const {
    borrowAssetReceiveAddress,
    collateralAccountId,
    collateralAssetId,
    borrowAssetId,
    depositAmountCryptoPrecision,
  } = useMemo(
    () => ({
      borrowAccountId: lendingQuoteQueryKey[1].borrowAccountId,
      collateralAccountId: lendingQuoteQueryKey[1].collateralAccountId,
      collateralAssetId: lendingQuoteQueryKey[1].collateralAssetId,
      borrowAssetId: lendingQuoteQueryKey[1].borrowAssetId,
      depositAmountCryptoPrecision: lendingQuoteQueryKey[1].depositAmountCryptoPrecision,
      borrowAssetReceiveAddress: lendingQuoteQueryKey[1].borrowAssetReceiveAddress,
    }),
    [lendingQuoteQueryKey],
  )

  const destinationAccountMetadataFilter = useMemo(
    () => ({ accountId: _borrowAccountId }),
    [_borrowAccountId],
  )
  const destinationAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, destinationAccountMetadataFilter),
  )
  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))
  const collateralAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, collateralAssetId),
  )

  const borrowAsset = useAppSelector(state => selectAssetById(state, _borrowAssetId))
  const borrowAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, _borrowAssetId),
  )

  const getBorrowAssetReceiveAddress = useCallback(async () => {
    if (!wallet || !_borrowAccountId || !destinationAccountMetadata || !borrowAsset) return

    const deviceId = await wallet.getDeviceID()
    const pubKey = isLedger(wallet) ? fromAccountId(_borrowAccountId).account : undefined

    return getReceiveAddress({
      asset: borrowAsset,
      wallet,
      deviceId,
      accountMetadata: destinationAccountMetadata,
      pubKey,
    })
  }, [borrowAsset, _borrowAccountId, destinationAccountMetadata, wallet])

  useEffect(() => {
    ;(async () => {
      const address = await getBorrowAssetReceiveAddress()
      if (address) setBorrowAssetReceiveAddress(address)
    })()
  }, [getBorrowAssetReceiveAddress])

  const query = useQuery({
    staleTime: 5_000,
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

      if (position.isErr()) throw new Error(position.unwrapErr())
      return position.unwrap()
    },
    select: data =>
      selectLendingQuoteQuery({
        data,
        collateralAssetMarketData,
        borrowAssetMarketData,
      }),
    // This avoids retrying errored queries - i.e smaller amounts will error with "failed to simulate swap: fail swap, not enough fee"
    // Failed queries go stale and don't honor "staleTime", which means smaller amounts would trigger a THOR daemon fetch from all consumers (3 currently)
    // vs. the failed query being considered fresh
    retry: false,
    // Do not refetch if consumers explicitly set enabled to false
    // They do so because the query should never run in the reactive react realm, but only programmatically with the refetch function
    refetchIntervalInBackground: enabled,
    refetchInterval: enabled ? 20_000 : undefined,
    enabled: Boolean(
      enabled &&
        bnOrZero(depositAmountCryptoPrecision).gt(0) &&
        collateralAccountId &&
        collateralAccountId &&
        borrowAssetId &&
        destinationAccountMetadata &&
        collateralAsset &&
        borrowAssetReceiveAddress &&
        collateralAssetMarketData.price !== '0',
    ),
  })

  return query
}
