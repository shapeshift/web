import { ArrowDownIcon, WarningIcon } from '@chakra-ui/icons'
import {
  Button,
  Collapse,
  Divider,
  Flex,
  Heading,
  IconButton,
  Skeleton,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  Tooltip,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { TradeAssetSelect } from 'components/MultiHopTrade/components/AssetSelection'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { useLendingQuoteCloseQuery } from 'pages/Lending/hooks/useLendingCloseQuery'
import { useLendingPositionData } from 'pages/Lending/hooks/useLendingPositionData'
import { useLendingSupportedAssets } from 'pages/Lending/hooks/useLendingSupportedAssets'
import { useQuoteEstimatedFeesQuery } from 'pages/Lending/hooks/useQuoteEstimatedFees'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { LoanSummary } from '../LoanSummary'
import { RepayRoutePaths } from './types'
const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
}

type RepayInputProps = {
  collateralAssetId: AssetId
  repaymentPercent: number
  onRepaymentPercentChange: (value: number) => void
  collateralAccountId: AccountId
  repaymentAccountId: AccountId
  onCollateralAccountIdChange: (accountId: AccountId) => void
  onRepaymentAccountIdChange: (accountId: AccountId) => void
  repaymentAsset: Asset | null
  setRepaymentAsset: (asset: Asset) => void
}

// no-op, this is read-only
const handleCollateralAccountIdChange = () => {}

export const RepayInput = ({
  collateralAssetId,
  repaymentPercent,
  onRepaymentPercentChange,
  collateralAccountId,
  repaymentAccountId,
  onRepaymentAccountIdChange: handleRepaymentAccountIdChange,
  repaymentAsset,
  setRepaymentAsset,
}: RepayInputProps) => {
  const [seenNotice, setSeenNotice] = useState(false)
  const translate = useTranslate()
  const history = useHistory()
  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))

  const onSubmit = useCallback(() => {
    history.push(RepayRoutePaths.Confirm)
  }, [history])

  const swapIcon = useMemo(() => <ArrowDownIcon />, [])

  const percentOptions = useMemo(() => [0], [])

  const { data: lendingSupportedAssets } = useLendingSupportedAssets({ type: 'borrow' })

  useEffect(() => {
    if (!lendingSupportedAssets) return

    setRepaymentAsset(lendingSupportedAssets[0])
  }, [lendingSupportedAssets, setRepaymentAsset])

  const useLendingQuoteCloseQueryArgs = useMemo(
    () => ({
      collateralAssetId,
      collateralAccountId,
      repaymentAssetId: repaymentAsset?.assetId ?? '',
      repaymentPercent,
      repaymentAccountId,
    }),
    [
      collateralAccountId,
      collateralAssetId,
      repaymentAccountId,
      repaymentAsset?.assetId,
      repaymentPercent,
    ],
  )

  const {
    data: lendingQuoteCloseData,
    isLoading: isLendingQuoteCloseLoading,
    isSuccess: isLendingQuoteCloseSuccess,
    isError: isLendingQuoteCloseError,
    error: lendingQuoteCloseError,
  } = useLendingQuoteCloseQuery(useLendingQuoteCloseQueryArgs)

  const buyAssetSearch = useModal('buyAssetSearch')
  const handleRepaymentAssetClick = useCallback(() => {
    if (!lendingSupportedAssets?.length) return

    buyAssetSearch.open({
      onClick: setRepaymentAsset,
      title: 'lending.repay',
      assets: lendingSupportedAssets,
    })
  }, [buyAssetSearch, lendingSupportedAssets, setRepaymentAsset])

  const handleAssetChange = useCallback((asset: Asset) => {
    return console.info(asset)
  }, [])

  const repaymentAssetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        assetId={repaymentAsset?.assetId ?? ''}
        onAssetClick={handleRepaymentAssetClick}
        onAssetChange={handleAssetChange}
        // Users have the possibility to repay in any supported asset, not only their collateral/borrowed asset
        // https://docs.thorchain.org/thorchain-finance/lending#loan-repayment-closeflow
        isReadOnly={false}
      />
    )
  }, [handleAssetChange, handleRepaymentAssetClick, repaymentAsset?.assetId])

  const collateralAssetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        assetId={collateralAssetId}
        onAssetClick={handleRepaymentAssetClick}
        onAssetChange={handleAssetChange}
        isReadOnly
      />
    )
  }, [collateralAssetId, handleAssetChange, handleRepaymentAssetClick])

  const handleSeenNotice = useCallback(() => setSeenNotice(true), [])

  const repaymentAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, repaymentAsset?.assetId ?? ''),
  )

  const {
    data: lendingPositionData,
    isLoading: isLendingPositionDataLoading,
    isError: isLendingPositionDataError,
    isSuccess: isLendingPositionDataSuccess,
  } = useLendingPositionData({
    assetId: collateralAssetId,
    accountId: collateralAccountId,
  })

  const repaymentAmountFiatUserCurrency = useMemo(() => {
    if (!lendingPositionData?.debtBalanceFiatUserCurrency) return null

    const proratedCollateralFiatUserCurrency = bnOrZero(repaymentPercent)
      .times(lendingPositionData?.debtBalanceFiatUserCurrency)
      .div(100)

    return proratedCollateralFiatUserCurrency.toFixed()
  }, [lendingPositionData, repaymentPercent])

  const repaymentAmountCryptoPrecision = useMemo(() => {
    if (!repaymentAmountFiatUserCurrency) return null

    return bnOrZero(repaymentAmountFiatUserCurrency).div(repaymentAssetMarketData.price).toFixed()
  }, [repaymentAmountFiatUserCurrency, repaymentAssetMarketData.price])

  const {
    data: estimatedFeesData,
    isLoading: isEstimatedFeesDataLoading,
    isError: isEstimatedFeesDataError,
    isSuccess: isEstimatedFeesDataSuccess,
  } = useQuoteEstimatedFeesQuery({
    collateralAssetId,
    collateralAccountId,
    repaymentAccountId,
    repaymentPercent,
    repaymentAsset,
  })

  const balanceFilter = useMemo(
    () => ({ assetId: repaymentAsset?.assetId ?? '', accountId: repaymentAccountId }),
    [repaymentAsset?.assetId, repaymentAccountId],
  )

  const balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, balanceFilter),
  )
  const amountAvailableCryptoPrecision = useMemo(
    () => bnOrZero(balance).times(bn(10).pow(collateralAsset?.precision ?? '0')),
    [balance, collateralAsset?.precision],
  )

  const hasEnoughBalance = useMemo(
    () =>
      bnOrZero(repaymentAmountCryptoPrecision)
        .plus(
          bnOrZero(estimatedFeesData?.txFeeCryptoBaseUnit).div(
            bn(10).pow(repaymentAsset?.precision ?? '0'),
          ),
        )
        .lte(amountAvailableCryptoPrecision),
    [
      amountAvailableCryptoPrecision,
      estimatedFeesData?.txFeeCryptoBaseUnit,
      repaymentAmountCryptoPrecision,
      repaymentAsset?.precision,
    ],
  )

  const quoteErrorTranslation = useMemo(() => {
    if (!hasEnoughBalance) return 'common.insufficientFunds'
    if (isLendingQuoteCloseError) {
      if (
        /not enough fee/i.test(lendingQuoteCloseError.message) ||
        /not enough to pay transaction fee/i.test(lendingQuoteCloseError.message)
      ) {
        return 'trade.errors.amountTooSmallUnknownMinimum'
      }
      if (
        /loan hasn't reached maturity/i.test(lendingQuoteCloseError.message) ||
        /loan repayment is unavailable/i.test(lendingQuoteCloseError.message)
      ) {
        return 'Repayment not yet available'
      }
      // This should never happen but it may
      // https://gitlab.com/thorchain/thornode/-/blob/051fafb06011e135e6b122600b5b023b7704d594/x/thorchain/handler_loan_repayment.go#L95
      if (/loan contains no collateral to redeem/i.test(lendingQuoteCloseError.message)) {
        console.error(
          'No collateral found. Ensure the loan_owner parameter is the correct address for the position',
        )
      }
    }
    return null
  }, [hasEnoughBalance, isLendingQuoteCloseError, lendingQuoteCloseError])

  if (!seenNotice) {
    return (
      <Stack spacing={6} px={4} py={6} textAlign='center' alignItems='center'>
        <WarningIcon color='text.warning' boxSize={12} />
        <Stack spacing={0} px={2}>
          <Heading as='h4'>{translate('lending.repayNoticeTitle')}</Heading>
          <Text color='text.subtle' translation='lending.repayNotice' />
        </Stack>
        <Button width='full' size='lg' colorScheme='blue' onClick={handleSeenNotice}>
          {translate('lending.repayNoticeCta')}
        </Button>
      </Stack>
    )
  }
  return (
    <Stack spacing={0}>
      <TradeAssetInput
        assetId={repaymentAsset?.assetId ?? ''}
        assetSymbol={repaymentAsset?.symbol ?? ''}
        assetIcon={''}
        cryptoAmount={repaymentAmountCryptoPrecision ?? '0'}
        fiatAmount={repaymentAmountFiatUserCurrency ?? '0'}
        isSendMaxDisabled={false}
        isReadOnly
        percentOptions={percentOptions}
        showInputSkeleton={false}
        showFiatSkeleton={false}
        label={translate('lending.repayAmount')}
        onAccountIdChange={handleRepaymentAccountIdChange}
        formControlProps={formControlProps}
        layout='inline'
        labelPostFix={repaymentAssetSelectComponent}
      >
        <Stack spacing={4} px={6} pb={4}>
          <Slider defaultValue={100} onChange={onRepaymentPercentChange}>
            <SliderTrack>
              <SliderFilledTrack bg='blue.500' />
            </SliderTrack>
            <Tooltip label={translate('lending.repayNotice')}>
              <SliderThumb boxSize={4} />
            </Tooltip>
          </Slider>
          <Flex width='full' justifyContent='space-between' fontSize='xs' color='text.subtle'>
            <Skeleton isLoaded={isLendingPositionDataSuccess}>
              <Amount.Fiat value={0} />
            </Skeleton>
            <Skeleton isLoaded={isLendingPositionDataSuccess}>
              {/* Actually defined at display time, see isLoaded above */}
              <Amount.Fiat value={lendingPositionData?.debtBalanceFiatUserCurrency ?? '0'} />
            </Skeleton>
          </Flex>
        </Stack>
      </TradeAssetInput>
      <Flex alignItems='center' justifyContent='center' my={-2}>
        <Divider />
        <IconButton
          isRound
          size='sm'
          position='relative'
          variant='outline'
          borderColor='border.base'
          zIndex={1}
          aria-label={translate('lending.switchAssets')}
          icon={swapIcon}
        />
        <Divider />
      </Flex>
      <TradeAssetInput
        assetId={collateralAssetId}
        assetSymbol={collateralAsset?.symbol ?? ''}
        assetIcon={collateralAsset?.icon ?? ''}
        // Both cryptoAmount and fiatAmount actually defined at display time, see showFiatSkeleton below
        cryptoAmount={lendingQuoteCloseData?.quoteWithdrawnAmountAfterFeesCryptoPrecision}
        fiatAmount={lendingQuoteCloseData?.quoteDebtRepaidAmountUsd}
        isSendMaxDisabled={false}
        percentOptions={percentOptions}
        showInputSkeleton={isLendingQuoteCloseLoading}
        showFiatSkeleton={false}
        label={translate('lending.unlockedCollateral')}
        onAccountIdChange={handleCollateralAccountIdChange}
        isReadOnly
        hideAmounts
        formControlProps={formControlProps}
        layout='inline'
        labelPostFix={collateralAssetSelectComponent}
      />
      <Collapse in={true}>
        <LoanSummary
          collateralAssetId={collateralAssetId}
          repayAmountCryptoPrecision={repaymentAmountCryptoPrecision ?? '0'}
          debtRepaidAmountUserCurrency={lendingQuoteCloseData?.quoteDebtRepaidAmountUsd ?? '0'}
          repaymentAsset={repaymentAsset}
          repaymentPercent={repaymentPercent}
          collateralDecreaseAmountCryptoPrecision={
            lendingQuoteCloseData?.quoteLoanCollateralDecreaseCryptoPrecision ?? '0'
          }
          repaymentAccountId={repaymentAccountId}
          collateralAccountId={collateralAccountId}
        />
      </Collapse>
      <Stack
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
            <Skeleton isLoaded={isLendingQuoteCloseSuccess}>
              <Amount.Crypto
                // Actually defined at display time, see isLoaded above
                value={lendingQuoteCloseData?.quoteSlippageWithdrawndAssetCryptoPrecision ?? '0'}
                symbol={collateralAsset?.symbol ?? ''}
              />
            </Skeleton>
          </Row.Value>
        </Row>
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.gasFee')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={isEstimatedFeesDataSuccess && isLendingQuoteCloseSuccess}>
              {/* Actually defined at display time, see isLoaded above */}
              <Amount.Fiat value={estimatedFeesData?.txFeeFiat ?? '0'} />
            </Skeleton>
          </Row.Value>
        </Row>
        <Row fontSize='sm' fontWeight='medium'>
          <HelperTooltip label={translate('lending.feesNotice')}>
            <Row.Label>{translate('common.fees')}</Row.Label>
          </HelperTooltip>
          <Row.Value>
            <Skeleton isLoaded={isLendingQuoteCloseSuccess}>
              <Amount.Fiat value={lendingQuoteCloseData?.quoteTotalFeesFiatUserCurrency ?? 0} />
            </Skeleton>
          </Row.Value>
        </Row>
        <Button
          size='lg'
          colorScheme={
            isLendingQuoteCloseError || isEstimatedFeesDataError || quoteErrorTranslation
              ? 'red'
              : 'blue'
          }
          mx={-2}
          onClick={onSubmit}
          isLoading={
            isLendingPositionDataLoading || isLendingQuoteCloseLoading || isEstimatedFeesDataLoading
          }
          isDisabled={Boolean(
            isLendingPositionDataLoading ||
              isLendingPositionDataError ||
              isLendingQuoteCloseLoading ||
              isEstimatedFeesDataLoading ||
              isLendingQuoteCloseError ||
              isEstimatedFeesDataError ||
              quoteErrorTranslation,
          )}
        >
          {quoteErrorTranslation ? translate(quoteErrorTranslation) : translate('lending.repay')}
        </Button>
      </Stack>
    </Stack>
  )
}
