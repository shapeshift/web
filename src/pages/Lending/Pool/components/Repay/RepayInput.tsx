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
import { type AccountId, type AssetId, fromAccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import prettyMilliseconds from 'pretty-ms'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useQuoteEstimatedFeesQuery } from 'react-queries/hooks/useQuoteEstimatedFeesQuery'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { TradeAssetSelect } from 'components/AssetSelection/AssetSelection'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useIsSmartContractAddress } from 'hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { useModal } from 'hooks/useModal/useModal'
import { useToggle } from 'hooks/useToggle/useToggle'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { getMaybeCompositeAssetSymbol } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import type { LendingQuoteClose } from 'lib/utils/thorchain/lending/types'
import { useLendingQuoteCloseQuery } from 'pages/Lending/hooks/useLendingCloseQuery'
import { useLendingPositionData } from 'pages/Lending/hooks/useLendingPositionData'
import { useLendingSupportedAssets } from 'pages/Lending/hooks/useLendingSupportedAssets'
import {
  selectAssetById,
  selectAssets,
  selectFeeAssetById,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

import { LoanSummary } from '../LoanSummary'
import { RepayRoutePaths } from './types'
const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
}

type RepayInputProps = {
  isAccountSelectionDisabled?: boolean
  collateralAssetId: AssetId
  repaymentPercent: number
  onRepaymentPercentChange: (value: number) => void
  collateralAccountId: AccountId
  repaymentAccountId: AccountId
  onCollateralAccountIdChange: (accountId: AccountId) => void
  onRepaymentAccountIdChange: (accountId: AccountId) => void
  repaymentAsset: Asset | null
  setRepaymentAsset: (asset: Asset) => void
  confirmedQuote: LendingQuoteClose | null
  setConfirmedQuote: (quote: LendingQuoteClose | null) => void
}

const percentOptions = [0]

export const RepayInput = ({
  collateralAssetId,
  repaymentPercent,
  isAccountSelectionDisabled,
  onRepaymentPercentChange,
  onCollateralAccountIdChange: handleCollateralAccountIdChange,
  collateralAccountId,
  repaymentAccountId,
  onRepaymentAccountIdChange: handleRepaymentAccountIdChange,
  repaymentAsset,
  setRepaymentAsset,
  confirmedQuote,
  setConfirmedQuote,
}: RepayInputProps) => {
  const [seenNotice, setSeenNotice] = useState(false)
  const [repaymentAssetIsFiat, toggleRepaymentAssetIsFiat] = useToggle(false)
  const [collateralAssetIsFiat, toggleCollateralAssetIsFiat] = useToggle(false)
  const translate = useTranslate()
  const history = useHistory()
  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))
  const repaymentFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, repaymentAsset?.assetId ?? ''),
  )
  const collateralFeeAsset = useAppSelector(state => selectFeeAssetById(state, collateralAssetId))

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
    isRefetching: isLendingQuoteCloseRefetching,
    isSuccess: isLendingQuoteCloseSuccess,
    isError: isLendingQuoteCloseError,
    error: lendingQuoteCloseError,
  } = useLendingQuoteCloseQuery(useLendingQuoteCloseQueryArgs)

  const isThorchainLendingRepayEnabled = useFeatureFlag('ThorchainLendingRepay')

  useEffect(() => {
    setConfirmedQuote(lendingQuoteCloseData ?? null)
  }, [lendingQuoteCloseData, setConfirmedQuote])

  const mixpanel = getMixPanel()
  const onSubmit = useCallback(() => {
    if (!lendingQuoteCloseData) return

    setConfirmedQuote(lendingQuoteCloseData)

    if (mixpanel) {
      const assets = selectAssets(store.getState())

      const compositeRepaymentAsset = getMaybeCompositeAssetSymbol(
        repaymentAsset?.assetId ?? '',
        assets,
      )
      const compositeCollateralAsset = getMaybeCompositeAssetSymbol(
        collateralAsset?.assetId ?? '',
        assets,
      )

      const eventData = {
        repaymentAsset: compositeRepaymentAsset,
        collateralAsset: compositeCollateralAsset,
        repaymentAssetChain: repaymentFeeAsset?.networkName,
        collateralAssetChain: collateralFeeAsset?.networkName,
        totalFeesUserCurrency: bn(lendingQuoteCloseData.quoteTotalFeesFiatUserCurrency).toFixed(2),
        totalFeesUsd: bn(lendingQuoteCloseData.quoteTotalFeesFiatUsd).toFixed(2),
        repaymentPercent,
        repaymentAmountUserCurrency: bnOrZero(
          lendingQuoteCloseData.repaymentAmountFiatUserCurrency,
        ).toFixed(2),
        repaymentAmountUsd: bnOrZero(lendingQuoteCloseData.repaymentAmountFiatUsd).toFixed(2),
        repaymentAmountCryptoPrecision: lendingQuoteCloseData.repaymentAmountCryptoPrecision,
        debtRepaidAmountUserCurrency: bn(
          lendingQuoteCloseData.quoteDebtRepaidAmountUserCurrency,
        ).toFixed(2),
        debtRepaidAmountUsd: bn(lendingQuoteCloseData.quoteDebtRepaidAmountUsd).toFixed(2),
        collateralDecreaseCryptoPrecision:
          lendingQuoteCloseData.quoteLoanCollateralDecreaseCryptoPrecision,
        collateralDecreaseUserCurrency: bn(
          lendingQuoteCloseData.quoteLoanCollateralDecreaseFiatUserCurrency,
        ).toFixed(2),
        collateralDecreaseUsd: bn(lendingQuoteCloseData.quoteLoanCollateralDecreaseFiatUsd).toFixed(
          2,
        ),
      }
      mixpanel.track(MixPanelEvent.RepayPreview, eventData)
    }

    history.push(RepayRoutePaths.Confirm)
  }, [
    collateralAsset?.assetId,
    collateralFeeAsset?.networkName,
    history,
    lendingQuoteCloseData,
    mixpanel,
    repaymentAsset?.assetId,
    repaymentFeeAsset?.networkName,
    repaymentPercent,
    setConfirmedQuote,
  ])

  const swapIcon = useMemo(() => <ArrowDownIcon />, [])

  const { data: lendingSupportedAssets, isLoading: isLendingSupportedAssetsLoading } =
    useLendingSupportedAssets({ type: 'borrow' })

  useEffect(() => {
    if (!(lendingSupportedAssets && collateralAsset)) return
    if (repaymentAsset) return

    setRepaymentAsset(collateralAsset)
  }, [collateralAsset, lendingSupportedAssets, repaymentAsset, setRepaymentAsset])

  const buyAssetSearch = useModal('buyAssetSearch')

  const handleRepaymentAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onAssetClick: setRepaymentAsset,
      title: 'lending.repay',
      assets: lendingSupportedAssets ?? [],
    })
  }, [buyAssetSearch, lendingSupportedAssets, setRepaymentAsset])

  const repaymentAssetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        assetId={repaymentAsset?.assetId ?? ''}
        onAssetClick={handleRepaymentAssetClick}
        onAssetChange={setRepaymentAsset}
        // Users have the possibility to repay in any supported asset, not only their collateral/borrowed asset
        // https://docs.thorchain.org/thorchain-finance/lending#loan-repayment-closeflow
        isReadOnly={false}
      />
    )
  }, [setRepaymentAsset, handleRepaymentAssetClick, repaymentAsset?.assetId])

  const collateralAssetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        assetId={collateralAssetId}
        isReadOnly
        isLoading={isLendingSupportedAssetsLoading}
      />
    )
  }, [collateralAssetId, isLendingSupportedAssetsLoading])

  const handleSeenNotice = useCallback(() => setSeenNotice(true), [])

  const {
    data: lendingPositionData,
    isLoading: isLendingPositionDataLoading,
    isError: isLendingPositionDataError,
    isSuccess: isLendingPositionDataSuccess,
  } = useLendingPositionData({
    assetId: collateralAssetId,
    accountId: collateralAccountId,
  })

  const {
    data: estimatedFeesData,
    isLoading: isEstimatedFeesDataLoading,
    isError: isEstimatedFeesDataError,
    isSuccess: isEstimatedFeesDataSuccess,
  } = useQuoteEstimatedFeesQuery({
    collateralAssetId,
    collateralAccountId,
    repaymentAccountId,
    repaymentAsset,
    confirmedQuote,
  })

  const balanceFilter = useMemo(
    () => ({ assetId: repaymentAsset?.assetId ?? '', accountId: repaymentAccountId }),
    [repaymentAsset?.assetId, repaymentAccountId],
  )

  const repaymentAssetBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, balanceFilter),
  )
  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: repaymentFeeAsset?.assetId ?? '', accountId: repaymentAccountId }),
    [repaymentFeeAsset?.assetId, repaymentAccountId],
  )
  const feeAssetBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, feeAssetBalanceFilter),
  )

  const amountAvailableCryptoPrecision = useMemo(
    () =>
      bnOrZero(repaymentAssetBalanceCryptoBaseUnit).times(
        bn(10).pow(collateralAsset?.precision ?? '0'),
      ),
    [repaymentAssetBalanceCryptoBaseUnit, collateralAsset?.precision],
  )

  const hasEnoughBalanceForTx = useMemo(() => {
    if (!(repaymentFeeAsset && repaymentAsset)) return

    return bnOrZero(lendingQuoteCloseData?.repaymentAmountCryptoPrecision).lte(
      amountAvailableCryptoPrecision,
    )
  }, [
    repaymentFeeAsset,
    repaymentAsset,
    lendingQuoteCloseData?.repaymentAmountCryptoPrecision,
    amountAvailableCryptoPrecision,
  ])

  const hasEnoughBalanceForTxPlusFees = useMemo(() => {
    if (!(repaymentFeeAsset && repaymentAsset)) return

    if (repaymentFeeAsset.assetId === repaymentAsset.assetId)
      return bnOrZero(lendingQuoteCloseData?.repaymentAmountCryptoPrecision)
        .plus(
          bnOrZero(estimatedFeesData?.txFeeCryptoBaseUnit).div(
            bn(10).pow(repaymentAsset.precision ?? '0'),
          ),
        )
        .lte(amountAvailableCryptoPrecision)

    return (
      bnOrZero(lendingQuoteCloseData?.repaymentAmountCryptoPrecision).lte(
        amountAvailableCryptoPrecision,
      ) && bnOrZero(estimatedFeesData?.txFeeCryptoBaseUnit).lte(feeAssetBalanceCryptoBaseUnit)
    )
  }, [
    repaymentFeeAsset,
    repaymentAsset,
    estimatedFeesData?.txFeeCryptoBaseUnit,
    amountAvailableCryptoPrecision,
    lendingQuoteCloseData?.repaymentAmountCryptoPrecision,
    feeAssetBalanceCryptoBaseUnit,
  ])

  const userAddress = useMemo(() => {
    if (!repaymentAccountId) return ''

    return fromAccountId(repaymentAccountId).account
  }, [repaymentAccountId])

  const { data: _isSmartContractAddress, isLoading: isAddressByteCodeLoading } =
    useIsSmartContractAddress(userAddress)

  const disableSmartContractRepayment = useMemo(() => {
    // This is either a smart contract address, or the bytecode is still loading - disable confirm
    if (_isSmartContractAddress !== false) return true

    // All checks passed - this is an EOA address
    return false
  }, [_isSmartContractAddress])

  const quoteErrorTranslation = useMemo(() => {
    if (!isThorchainLendingRepayEnabled) return 'lending.errors.repaymentsDisabled'
    if (_isSmartContractAddress) return 'trade.errors.smartContractWalletNotSupported'
    if (!hasEnoughBalanceForTxPlusFees || !hasEnoughBalanceForTx) return 'common.insufficientFunds'
    if (isLendingQuoteCloseError) {
      if (
        /not enough fee/i.test(lendingQuoteCloseError.message) ||
        /not enough to pay transaction fee/i.test(lendingQuoteCloseError.message)
      )
        return 'trade.errors.amountTooSmallUnknownMinimum'
      if (
        /loan hasn't reached maturity/i.test(lendingQuoteCloseError.message) ||
        /loan repayment is unavailable/i.test(lendingQuoteCloseError.message)
      )
        return 'Repayment not yet available'

      if (/trading is halted/i.test(lendingQuoteCloseError.message))
        return 'lending.errors.repaymentsHalted'

      // This should never happen but it may
      // https://gitlab.com/thorchain/thornode/-/blob/051fafb06011e135e6b122600b5b023b7704d594/x/thorchain/handler_loan_repayment.go#L95
      if (/loan contains no collateral to redeem/i.test(lendingQuoteCloseError.message)) {
        console.error(
          'No collateral found. Ensure the loan_owner parameter is the correct address for the position',
        )
      }
    }
    return null
  }, [
    _isSmartContractAddress,
    hasEnoughBalanceForTx,
    hasEnoughBalanceForTxPlusFees,
    isLendingQuoteCloseError,
    isThorchainLendingRepayEnabled,
    lendingQuoteCloseError?.message,
  ])

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
        cryptoAmount={lendingQuoteCloseData?.repaymentAmountCryptoPrecision ?? '0'}
        fiatAmount={lendingQuoteCloseData?.repaymentAmountFiatUserCurrency ?? '0'}
        isSendMaxDisabled={false}
        isReadOnly
        onToggleIsFiat={toggleRepaymentAssetIsFiat}
        isFiat={repaymentAssetIsFiat}
        percentOptions={percentOptions}
        showInputSkeleton={isLendingQuoteCloseLoading || isLendingQuoteCloseRefetching}
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
        accountId={collateralAccountId}
        assetId={collateralAssetId}
        assetSymbol={collateralAsset?.symbol ?? ''}
        assetIcon={collateralAsset?.icon ?? ''}
        // Both cryptoAmount and fiatAmount actually defined at display time, see showFiatSkeleton below
        cryptoAmount={lendingQuoteCloseData?.quoteWithdrawnAmountAfterFeesCryptoPrecision}
        fiatAmount={lendingQuoteCloseData?.quoteDebtRepaidAmountUserCurrency}
        isAccountSelectionDisabled={isAccountSelectionDisabled}
        isSendMaxDisabled={false}
        percentOptions={percentOptions}
        showInputSkeleton={isLendingQuoteCloseLoading || isLendingQuoteCloseRefetching}
        showFiatSkeleton={false}
        label={translate('lending.unlockedCollateral')}
        onAccountIdChange={handleCollateralAccountIdChange}
        isReadOnly
        onToggleIsFiat={toggleCollateralAssetIsFiat}
        isFiat={collateralAssetIsFiat}
        // When repaying 100% of the loan, the user gets their collateral back
        hideAmounts={bn(repaymentPercent).lt(100)}
        formControlProps={formControlProps}
        layout='inline'
        labelPostFix={collateralAssetSelectComponent}
      />
      <Collapse in={isLendingQuoteCloseSuccess}>
        <LoanSummary
          confirmedQuote={confirmedQuote}
          isLoading={isLendingQuoteCloseLoading || isLendingQuoteCloseRefetching}
          collateralAssetId={collateralAssetId}
          repayAmountCryptoPrecision={lendingQuoteCloseData?.repaymentAmountCryptoPrecision ?? '0'}
          debtRepaidAmountUserCurrency={
            lendingQuoteCloseData?.quoteDebtRepaidAmountUserCurrency ?? '0'
          }
          repaymentAsset={repaymentAsset}
          repaymentPercent={repaymentPercent}
          collateralDecreaseAmountCryptoPrecision={
            lendingQuoteCloseData?.quoteLoanCollateralDecreaseCryptoPrecision ?? '0'
          }
          repaymentAccountId={repaymentAccountId}
          collateralAccountId={collateralAccountId}
        />
        <Stack
          borderTopWidth={1}
          borderColor='border.subtle'
          flexDir='column'
          gap={4}
          px={6}
          py={4}
          bg='background.surface.raised.accent'
        >
          <Row fontSize='sm' fontWeight='medium'>
            <Row.Label>{translate('common.slippage')}</Row.Label>
            <Row.Value>
              <Skeleton isLoaded={isLendingQuoteCloseSuccess && !isLendingQuoteCloseRefetching}>
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
              <Skeleton
                isLoaded={
                  isEstimatedFeesDataSuccess &&
                  isLendingQuoteCloseSuccess &&
                  !isLendingQuoteCloseRefetching
                }
              >
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
              <Skeleton isLoaded={isLendingQuoteCloseSuccess && !isLendingQuoteCloseRefetching}>
                <Amount.Fiat value={lendingQuoteCloseData?.quoteTotalFeesFiatUserCurrency ?? 0} />
              </Skeleton>
            </Row.Value>
          </Row>
          <Row fontSize='sm' fontWeight='medium'>
            <Row.Label>{translate('bridge.waitTimeLabel')}</Row.Label>
            <Row.Value>
              <Skeleton isLoaded={isLendingQuoteCloseSuccess && !isLendingQuoteCloseRefetching}>
                <RawText fontWeight='bold'>
                  {prettyMilliseconds(lendingQuoteCloseData?.quoteTotalTimeMs ?? 0)}
                </RawText>
              </Skeleton>
            </Row.Value>
          </Row>
        </Stack>
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
            isLendingPositionDataLoading ||
            isLendingQuoteCloseLoading ||
            isLendingQuoteCloseRefetching ||
            isEstimatedFeesDataLoading ||
            isAddressByteCodeLoading
          }
          isDisabled={Boolean(
            !isThorchainLendingRepayEnabled ||
              isLendingPositionDataLoading ||
              isLendingPositionDataError ||
              isLendingQuoteCloseLoading ||
              isLendingQuoteCloseRefetching ||
              isEstimatedFeesDataLoading ||
              isLendingQuoteCloseError ||
              isEstimatedFeesDataError ||
              disableSmartContractRepayment ||
              quoteErrorTranslation,
          )}
        >
          {quoteErrorTranslation ? translate(quoteErrorTranslation) : translate('lending.repay')}
        </Button>
      </Stack>
    </Stack>
  )
}
