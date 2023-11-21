import { Button, CardFooter, Collapse, Skeleton, Stack } from '@chakra-ui/react'
import { type AccountId, type AssetId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { TradeAssetSelect } from 'components/MultiHopTrade/components/AssetSelection'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { useGetEstimatedFeesQuery } from 'pages/Lending/hooks/useGetEstimatedFeesQuery'
import { useIsSweepNeededQuery } from 'pages/Lending/hooks/useIsSweepNeededQuery'
import { useLendingQuoteOpenQuery } from 'pages/Lending/hooks/useLendingQuoteQuery'
import { useLendingSupportedAssets } from 'pages/Lending/hooks/useLendingSupportedAssets'
import { useQuoteEstimatedFeesQuery } from 'pages/Lending/hooks/useQuoteEstimatedFees'
import { getThorchainLendingPosition } from 'state/slices/opportunitiesSlice/resolvers/thorchainLending/utils'
import { getThorchainFromAddress } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import {
  selectAssetById,
  selectPortfolioAccountMetadataByAccountId,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { LoanSummary } from '../LoanSummary'
import { BorrowRoutePaths } from './types'
const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
}

type BorrowInputProps = {
  collateralAssetId: AssetId
  depositAmountCryptoPrecision: string | null
  fiatDepositAmount: string | null
  onDepositAmountChange: (value: string, isFiat?: boolean) => void
  collateralAccountId: AccountId
  borrowAccountId: AccountId
  onCollateralAccountIdChange: (accountId: AccountId) => void
  onBorrowAccountIdChange: (accountId: AccountId) => void
  borrowAsset: Asset | null
  setBorrowAsset: (asset: Asset) => void
}

export const BorrowInput = ({
  collateralAssetId,
  depositAmountCryptoPrecision,
  fiatDepositAmount,
  onDepositAmountChange,
  collateralAccountId,
  borrowAccountId,
  onCollateralAccountIdChange: handleCollateralAccountIdChange,
  onBorrowAccountIdChange: handleBorrowAccountIdChange,
  borrowAsset,
  setBorrowAsset,
}: BorrowInputProps) => {
  const [fromAddress, setFromAddress] = useState<string | null>(null)

  const {
    state: { wallet },
  } = useWallet()
  const translate = useTranslate()
  const history = useHistory()

  const { data: lendingSupportedAssets } = useLendingSupportedAssets()

  useEffect(() => {
    if (!lendingSupportedAssets) return

    setBorrowAsset(lendingSupportedAssets[0])
  }, [lendingSupportedAssets, setBorrowAsset])

  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))

  const percentOptions = useMemo(() => [0], [])

  const buyAssetSearch = useModal('buyAssetSearch')
  const handleBorrowAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onClick: setBorrowAsset,
      title: 'lending.borrow',
      assets: lendingSupportedAssets,
    })
  }, [buyAssetSearch, lendingSupportedAssets, setBorrowAsset])

  const handleAssetChange = useCallback((asset: Asset) => {
    return console.info(asset)
  }, [])

  const handleDepositInputChange = useCallback(
    (value: string, isFiat?: boolean) => {
      onDepositAmountChange(value, isFiat)
    },
    [onDepositAmountChange],
  )

  const collateralAccountFilter = useMemo(
    () => ({ accountId: collateralAccountId }),
    [collateralAccountId],
  )
  const collateralAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, collateralAccountFilter),
  )

  const getBorrowFromAddress = useCallback(() => {
    if (!(wallet && collateralAccountMetadata)) return null
    return getThorchainFromAddress({
      accountId: collateralAccountId,
      assetId: collateralAssetId,
      getPosition: getThorchainLendingPosition,
      accountMetadata: collateralAccountMetadata,
      wallet,
    })
  }, [collateralAccountId, collateralAccountMetadata, collateralAssetId, wallet])

  useEffect(() => {
    if (fromAddress) return
    ;(async () => {
      const _fromAddress = await getBorrowFromAddress()
      if (!_fromAddress) return
      setFromAddress(_fromAddress)
    })()
  }, [getBorrowFromAddress, fromAddress])

  const {
    data: estimatedFeesData,
    isLoading: isEstimatedFeesDataLoading,
    isError: isEstimatedFeesDataError,
    isSuccess: isEstimatedFeesDataSuccess,
  } = useQuoteEstimatedFeesQuery({
    collateralAssetId,
    collateralAccountId,
    borrowAccountId,
    borrowAssetId: borrowAsset?.assetId ?? '',
    depositAmountCryptoPrecision: depositAmountCryptoPrecision ?? '0',
  })

  const balanceFilter = useMemo(
    () => ({ assetId: collateralAssetId, accountId: collateralAccountId }),
    [collateralAssetId, collateralAccountId],
  )
  const balanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, balanceFilter),
  )
  const amountAvailableCryptoPrecision = useMemo(
    () => fromBaseUnit(balanceCryptoBaseUnit, collateralAsset?.precision ?? 0),
    [balanceCryptoBaseUnit, collateralAsset?.precision],
  )

  const hasEnoughBalanceForTx = useMemo(() => {
    if (!isEstimatedFeesDataSuccess) return false

    return bnOrZero(depositAmountCryptoPrecision)
      .plus(fromBaseUnit(estimatedFeesData.txFeeCryptoBaseUnit, collateralAsset?.precision ?? 0))
      .lte(amountAvailableCryptoPrecision)
  }, [
    amountAvailableCryptoPrecision,
    collateralAsset?.precision,
    depositAmountCryptoPrecision,
    estimatedFeesData,
    isEstimatedFeesDataSuccess,
  ])

  const isSweepNeededArgs = useMemo(
    () => ({
      assetId: collateralAssetId,
      address: fromAddress,
      amountCryptoBaseUnit: toBaseUnit(
        depositAmountCryptoPrecision ?? 0,
        collateralAsset?.precision ?? 0,
      ),
      txFeeCryptoBaseUnit: estimatedFeesData?.txFeeCryptoBaseUnit ?? '0', // actually defined at runtime, see "enabled" below
      // Don't fetch sweep needed if there isn't enough balance for the tx + fees, since adding in a sweep Tx would obviously fail too
      enabled: Boolean(
        bnOrZero(depositAmountCryptoPrecision).gt(0) &&
          isEstimatedFeesDataSuccess &&
          hasEnoughBalanceForTx,
      ),
    }),
    [
      collateralAsset?.precision,
      collateralAssetId,
      depositAmountCryptoPrecision,
      estimatedFeesData?.txFeeCryptoBaseUnit,
      fromAddress,
      hasEnoughBalanceForTx,
      isEstimatedFeesDataSuccess,
    ],
  )
  const {
    data: isSweepNeeded,
    isLoading: isSweepNeededLoading,
    isSuccess: isSweepNeededSuccess,
  } = useIsSweepNeededQuery(isSweepNeededArgs)

  const {
    data: estimatedSweepFeesData,
    isLoading: isEstimatedSweepFeesDataLoading,
    isSuccess: isEstimatedSweepFeesDataSuccess,
  } = useGetEstimatedFeesQuery({
    cryptoAmount: '0',
    assetId: collateralAssetId,
    to: fromAddress ?? '',
    sendMax: true,
    accountId: collateralAccountId,
    contractAddress: undefined,
    enabled: isSweepNeededSuccess,
  })

  const hasEnoughBalanceForTxPlusSweep = useMemo(() => {
    if (!(isEstimatedFeesDataSuccess && isEstimatedSweepFeesDataSuccess && estimatedSweepFeesData))
      return false

    return bnOrZero(depositAmountCryptoPrecision)
      .plus(fromBaseUnit(estimatedFeesData.txFeeCryptoBaseUnit, collateralAsset?.precision ?? 0))
      .plus(
        fromBaseUnit(estimatedSweepFeesData.txFeeCryptoBaseUnit, collateralAsset?.precision ?? 0),
      )
      .lte(amountAvailableCryptoPrecision)
  }, [
    amountAvailableCryptoPrecision,
    collateralAsset?.precision,
    depositAmountCryptoPrecision,
    estimatedFeesData?.txFeeCryptoBaseUnit,
    estimatedSweepFeesData,
    isEstimatedFeesDataSuccess,
    isEstimatedSweepFeesDataSuccess,
  ])

  const onSubmit = useCallback(() => {
    if (!isSweepNeeded) return history.push(BorrowRoutePaths.Confirm)
    history.push(BorrowRoutePaths.Sweep)
  }, [history, isSweepNeeded])

  const depositAssetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        assetId={collateralAssetId}
        onAssetClick={handleBorrowAssetClick}
        onAssetChange={handleAssetChange}
        isReadOnly
      />
    )
  }, [collateralAssetId, handleAssetChange, handleBorrowAssetClick])

  const borrowAssetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        assetId={borrowAsset?.assetId ?? ''}
        onAssetClick={handleBorrowAssetClick}
        onAssetChange={handleAssetChange}
      />
    )
  }, [borrowAsset?.assetId, handleAssetChange, handleBorrowAssetClick])

  const useLendingQuoteQueryArgs = useMemo(
    () => ({
      collateralAssetId,
      collateralAccountId,
      borrowAccountId,
      borrowAssetId: borrowAsset?.assetId ?? '',
      depositAmountCryptoPrecision: depositAmountCryptoPrecision ?? '0',
    }),
    [
      borrowAccountId,
      borrowAsset?.assetId,
      collateralAccountId,
      collateralAssetId,
      depositAmountCryptoPrecision,
    ],
  )
  const {
    data,
    isLoading: isLendingQuoteLoading,
    isSuccess: isLendingQuoteSuccess,
    isError: isLendingQuoteError,
    error: lendingQuoteError,
  } = useLendingQuoteOpenQuery(useLendingQuoteQueryArgs)

  const quoteErrorTranslation = useMemo(() => {
    if (isLendingQuoteSuccess && isEstimatedFeesDataSuccess && !hasEnoughBalanceForTxPlusSweep)
      return 'common.insufficientFunds'
    if (isLendingQuoteError) {
      if (
        /not enough fee/.test(lendingQuoteError.message) ||
        /not enough to pay transaction fee/.test(lendingQuoteError.message)
      ) {
        return 'trade.errors.amountTooSmallUnknownMinimum'
      }
    }
    return null
  }, [
    hasEnoughBalanceForTxPlusSweep,
    isEstimatedFeesDataSuccess,
    isLendingQuoteError,
    isLendingQuoteSuccess,
    lendingQuoteError?.message,
  ])

  const lendingQuoteData = isLendingQuoteError ? null : data

  if (!(collateralAsset && borrowAsset)) return null

  return (
    <SlideTransition>
      <Stack spacing={0}>
        <TradeAssetInput
          accountId={collateralAccountId}
          assetId={collateralAssetId}
          assetSymbol={collateralAsset.symbol}
          assetIcon={collateralAsset.icon}
          onChange={handleDepositInputChange}
          cryptoAmount={depositAmountCryptoPrecision ?? '0'}
          fiatAmount={fiatDepositAmount ?? '0'}
          isSendMaxDisabled={false}
          percentOptions={percentOptions}
          showInputSkeleton={false}
          showFiatSkeleton={false}
          label={translate('lending.depositAsset', { asset: collateralAsset.symbol })}
          onAccountIdChange={handleCollateralAccountIdChange}
          formControlProps={formControlProps}
          layout='inline'
          labelPostFix={depositAssetSelectComponent}
        />
        <TradeAssetInput
          assetId={borrowAsset?.assetId ?? ''}
          assetSymbol={borrowAsset.symbol}
          assetIcon={borrowAsset.icon}
          cryptoAmount={lendingQuoteData?.quoteBorrowedAmountCryptoPrecision ?? '0'}
          fiatAmount={lendingQuoteData?.quoteBorrowedAmountUserCurrency ?? '0'}
          isReadOnly
          isSendMaxDisabled={false}
          percentOptions={percentOptions}
          showInputSkeleton={isLendingQuoteLoading}
          showFiatSkeleton={isLendingQuoteLoading}
          label={translate('lending.borrow')}
          onAccountIdChange={handleBorrowAccountIdChange}
          formControlProps={formControlProps}
          layout='inline'
          labelPostFix={borrowAssetSelectComponent}
        />
        <Collapse in={true}>
          <LoanSummary
            collateralAssetId={collateralAssetId}
            collateralAccountId={collateralAccountId}
            depositAmountCryptoPrecision={depositAmountCryptoPrecision ?? '0'}
            borrowAssetId={borrowAsset?.assetId ?? ''}
            borrowAccountId={borrowAccountId}
          />
        </Collapse>
        <CardFooter
          borderTopWidth={1}
          borderColor='border.subtle'
          flexDir='column'
          gap={4}
          px={6}
          py={4}
          bg='background.surface.raised.accent'
          borderBottomRadius='xl'
        >
          <Row fontSize='sm' fontWeight='medium'>
            <Row.Label>{translate('common.slippage')}</Row.Label>
            <Row.Value>
              <Skeleton isLoaded={isLendingQuoteSuccess}>
                <Amount.Crypto
                  value={lendingQuoteData?.quoteSlippageBorrowedAssetCryptoPrecision ?? '0'}
                  symbol='BTC'
                />
              </Skeleton>
            </Row.Value>
          </Row>
          <Row fontSize='sm' fontWeight='medium'>
            <Row.Label>{translate('common.gasFee')}</Row.Label>
            <Row.Value>
              <Skeleton isLoaded={isEstimatedFeesDataSuccess && isLendingQuoteSuccess}>
                <Amount.Fiat value={estimatedFeesData?.txFeeFiat ?? '0'} />
              </Skeleton>
            </Row.Value>
          </Row>
          <Row fontSize='sm' fontWeight='medium'>
            <Row.Label>{translate('common.fees')}</Row.Label>
            <Row.Value>
              <Skeleton isLoaded={isLendingQuoteSuccess}>
                <Amount.Fiat value={lendingQuoteData?.quoteTotalFeesFiatUserCurrency ?? '0'} />
              </Skeleton>
            </Row.Value>
          </Row>
          <Button
            size='lg'
            colorScheme={isLendingQuoteError || quoteErrorTranslation ? 'red' : 'blue'}
            mx={-2}
            onClick={onSubmit}
            isLoading={
              isLendingQuoteLoading ||
              isEstimatedFeesDataLoading ||
              isEstimatedSweepFeesDataLoading ||
              isEstimatedSweepFeesDataLoading ||
              isSweepNeededLoading
            }
            isDisabled={Boolean(
              bnOrZero(depositAmountCryptoPrecision).isZero() ||
                isLendingQuoteError ||
                isLendingQuoteLoading ||
                quoteErrorTranslation ||
                isEstimatedFeesDataError ||
                isEstimatedFeesDataLoading,
            )}
          >
            {quoteErrorTranslation ? translate(quoteErrorTranslation) : translate('lending.borrow')}
          </Button>
        </CardFooter>
      </Stack>
    </SlideTransition>
  )
}
