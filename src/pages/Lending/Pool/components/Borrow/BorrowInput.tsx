import { ArrowDownIcon } from '@chakra-ui/icons'
import {
  Button,
  CardFooter,
  Collapse,
  Divider,
  Flex,
  IconButton,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import { type AccountId, type AssetId, fromAccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'
import prettyMilliseconds from 'pretty-ms'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useQuoteEstimatedFeesQuery } from 'react-queries/hooks/useQuoteEstimatedFeesQuery'
import { useHistory } from 'react-router'
import { WarningAcknowledgement } from 'components/Acknowledgement/Acknowledgement'
import { Amount } from 'components/Amount/Amount'
import { TradeAssetSelect } from 'components/AssetSelection/AssetSelection'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useIsSmartContractAddress } from 'hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { useModal } from 'hooks/useModal/useModal'
import { useToggle } from 'hooks/useToggle/useToggle'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { getMaybeCompositeAssetSymbol } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { getThorchainLendingPosition } from 'lib/utils/thorchain/lending'
import type { LendingQuoteOpen } from 'lib/utils/thorchain/lending/types'
import { isUtxoChainId } from 'lib/utils/utxo'
import { useGetEstimatedFeesQuery } from 'pages/Lending/hooks/useGetEstimatedFeesQuery'
import { useIsSweepNeededQuery } from 'pages/Lending/hooks/useIsSweepNeededQuery'
import { useLendingQuoteOpenQuery } from 'pages/Lending/hooks/useLendingQuoteQuery'
import { useLendingSupportedAssets } from 'pages/Lending/hooks/useLendingSupportedAssets'
import { usePoolDataQuery } from 'pages/Lending/hooks/usePoolDataQuery'
import {
  selectAssetById,
  selectAssets,
  selectFeeAssetById,
  selectPortfolioAccountMetadataByAccountId,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

import { LoanSummary } from '../LoanSummary'
import { BorrowRoutePaths } from './types'

const UNSAFE_SLIPPAGE_DECIMAL_PERCENT = 0.05 // 5%

const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
}

type BorrowInputProps = {
  isAccountSelectionDisabled?: boolean
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
  confirmedQuote: LendingQuoteOpen | null
  setConfirmedQuote: (quote: LendingQuoteOpen | null) => void
}

const percentOptions = [0]

export const BorrowInput = ({
  isAccountSelectionDisabled,
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
  confirmedQuote,
  setConfirmedQuote,
}: BorrowInputProps) => {
  const [borrowAssetIsFiat, toggleBorrowAssetIsFiat] = useToggle(false)
  const [collateralAssetIsFiat, toggleCollateralAssetIsFiat] = useToggle(false)
  const [shouldShowWarningAcknowledgement, setShouldShowWarningAcknowledgement] = useState(false)

  const {
    state: { wallet },
  } = useWallet()
  const translate = useTranslate()
  const history = useHistory()

  const { data: borrowAssets, isLoading: isSupportedBorrowAssetsLoading } =
    useLendingSupportedAssets({ type: 'borrow' })
  const borrowAssetIds = useMemo(() => {
    return borrowAssets?.map(borrowAsset => borrowAsset.assetId) ?? []
  }, [borrowAssets])
  const { data: collateralAssets, isLoading: isSupportedCollateralAssetsLoading } =
    useLendingSupportedAssets({ type: 'borrow' })
  const collateralAssetIds = useMemo(() => {
    return collateralAssets?.map(collateralAsset => collateralAsset.assetId) ?? []
  }, [collateralAssets])

  const usePoolDataArgs = useMemo(() => ({ poolAssetId: collateralAssetId }), [collateralAssetId])
  const { data: poolData, isLoading: isPoolDataLoading } = usePoolDataQuery(usePoolDataArgs)
  const isHardCapReached = useMemo(() => {
    if (!poolData) return null
    return bnOrZero(poolData.tvl).eq(poolData.maxSupplyFiat)
  }, [poolData])

  const isThorchainLendingBorrowEnabled = useFeatureFlag('ThorchainLendingBorrow')

  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))

  useEffect(() => {
    if (!(collateralAsset && borrowAssets)) return
    if (borrowAsset) return

    if (!borrowAsset) setBorrowAsset(collateralAsset)
  }, [borrowAsset, borrowAssets, collateralAsset, setBorrowAsset])

  const swapIcon = useMemo(() => <ArrowDownIcon />, [])

  const buyAssetSearch = useModal('buyAssetSearch')

  const handleBorrowAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onAssetClick: setBorrowAsset,
      title: 'lending.borrow',
      assets: borrowAssets ?? [],
    })
  }, [borrowAssets, buyAssetSearch, setBorrowAsset])

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

  const { data: fromAddress } = useQuery({
    ...reactQueries.common.thorchainFromAddress({
      accountId: collateralAccountId,
      assetId: collateralAssetId,
      getPosition: getThorchainLendingPosition,
      accountMetadata: collateralAccountMetadata!,
      wallet: wallet!,
    }),
    enabled: Boolean(collateralAccountMetadata && wallet),
  })

  const {
    data: estimatedFeesData,
    isLoading: isEstimatedFeesDataLoading,
    isError: isEstimatedFeesDataError,
    isSuccess: isEstimatedFeesDataSuccess,
  } = useQuoteEstimatedFeesQuery({
    collateralAssetId,
    collateralAccountId,
    depositAmountCryptoPrecision: depositAmountCryptoPrecision ?? '0',
    confirmedQuote,
  })

  const balanceFilter = useMemo(
    () => ({ assetId: collateralAssetId, accountId: collateralAccountId }),
    [collateralAssetId, collateralAccountId],
  )
  const balanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, balanceFilter),
  )
  const collateralFeeAsset = useAppSelector(state => selectFeeAssetById(state, collateralAssetId))
  const borrowFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, borrowAsset?.assetId ?? ''),
  )

  const collateralFeeAssetBalanceFilter = useMemo(
    () => ({ assetId: collateralFeeAsset?.assetId ?? '', accountId: collateralAccountId }),
    [collateralAccountId, collateralFeeAsset?.assetId],
  )
  const collateralFeeAssetBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, collateralFeeAssetBalanceFilter),
  )

  const amountAvailableCryptoPrecision = useMemo(
    () => fromBaseUnit(balanceCryptoBaseUnit, collateralAsset?.precision ?? 0),
    [balanceCryptoBaseUnit, collateralAsset?.precision],
  )

  const hasEnoughBalanceForTx = useMemo(
    () => bnOrZero(depositAmountCryptoPrecision).lte(amountAvailableCryptoPrecision),
    [amountAvailableCryptoPrecision, depositAmountCryptoPrecision],
  )

  const hasEnoughBalanceForTxPlusFees = useMemo(() => {
    if (!(isEstimatedFeesDataSuccess && collateralFeeAsset)) return false

    // This is a native asset, so we can deduct the fees from the value
    if (collateralFeeAsset.assetId === collateralAssetId)
      return bnOrZero(depositAmountCryptoPrecision)
        .plus(fromBaseUnit(estimatedFeesData.txFeeCryptoBaseUnit, collateralAsset?.precision ?? 0))
        .lte(amountAvailableCryptoPrecision)

    return (
      bnOrZero(depositAmountCryptoPrecision).lte(amountAvailableCryptoPrecision) &&
      bnOrZero(estimatedFeesData.txFeeCryptoBaseUnit).lte(collateralFeeAssetBalanceCryptoBaseUnit)
    )
  }, [
    amountAvailableCryptoPrecision,
    collateralAsset?.precision,
    collateralAssetId,
    depositAmountCryptoPrecision,
    estimatedFeesData?.txFeeCryptoBaseUnit,
    collateralFeeAsset,
    collateralFeeAssetBalanceCryptoBaseUnit,
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
      txFeeCryptoBaseUnit: estimatedFeesData?.txFeeCryptoBaseUnit,
      // Don't fetch sweep needed if there isn't enough balance for the tx + fees, since adding in a sweep Tx would obviously fail too
      enabled: Boolean(
        bnOrZero(depositAmountCryptoPrecision).gt(0) && hasEnoughBalanceForTxPlusFees,
      ),
    }),
    [
      collateralAsset?.precision,
      collateralAssetId,
      depositAmountCryptoPrecision,
      estimatedFeesData?.txFeeCryptoBaseUnit,
      fromAddress,
      hasEnoughBalanceForTxPlusFees,
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
    amountCryptoPrecision: '0',
    assetId: collateralAssetId,
    feeAssetId: collateralFeeAsset?.assetId!,
    to: fromAddress ?? '',
    sendMax: true,
    accountId: collateralAccountId,
    contractAddress: undefined,
    enabled: Boolean(collateralFeeAsset && isSweepNeededSuccess),
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
    isRefetching: isLendingQuoteRefetching,
    isSuccess: isLendingQuoteSuccess,
    isError: isLendingQuoteError,
    error: lendingQuoteError,
  } = useLendingQuoteOpenQuery(useLendingQuoteQueryArgs)

  const lendingQuoteData = isLendingQuoteError ? null : data

  const quoteSlippageDecimalPercentage = useMemo(() => {
    return lendingQuoteData
      ? bnOrZero(lendingQuoteData.quoteSlippageBorrowedAssetUsd)
          .div(lendingQuoteData.quoteCollateralAmountFiatUsd)
          .toNumber()
      : undefined
  }, [lendingQuoteData])

  const isUnsafeQuote = useMemo(
    () =>
      quoteSlippageDecimalPercentage &&
      quoteSlippageDecimalPercentage > UNSAFE_SLIPPAGE_DECIMAL_PERCENT,
    [quoteSlippageDecimalPercentage],
  )

  useEffect(() => {
    setConfirmedQuote(lendingQuoteData ?? null)
  }, [isLendingQuoteSuccess, lendingQuoteData, setConfirmedQuote])

  const userAddress = useMemo(() => {
    if (!collateralAccountId) return ''

    return fromAccountId(collateralAccountId).account
  }, [collateralAccountId])

  const { data: _isSmartContractAddress, isLoading: isAddressByteCodeLoading } =
    useIsSmartContractAddress(userAddress, borrowAsset?.chainId ?? '')

  const disableSmartContractDeposit = useMemo(() => {
    // This is either a smart contract address, or the bytecode is still loading - disable confirm
    if (_isSmartContractAddress) return true

    // All checks passed - this is an EOA address
    return false
  }, [_isSmartContractAddress])

  const mixpanel = getMixPanel()
  const onSubmit = useCallback(() => {
    if (!lendingQuoteData || !collateralAsset || !borrowAsset) return

    if (mixpanel) {
      const assets = selectAssets(store.getState())

      const compositeBorrowAsset = getMaybeCompositeAssetSymbol(borrowAsset.assetId, assets)
      const compositeCollateralAsset = getMaybeCompositeAssetSymbol(collateralAsset.assetId, assets)

      const eventData = {
        borrowAsset: compositeBorrowAsset,
        collateralAsset: compositeCollateralAsset,
        borrowAssetChain: borrowFeeAsset?.networkName,
        collateralAssetChain: collateralFeeAsset?.networkName,
        totalFeesUserCurrency: bn(lendingQuoteData.quoteTotalFeesFiatUserCurrency).toFixed(2),
        totalFeesUsd: bn(lendingQuoteData.quoteTotalFeesFiatUsd).toFixed(2),
        depositAmountCryptoPrecision,
        collateralAmountCryptoPrecision: lendingQuoteData.quoteCollateralAmountCryptoPrecision,
        collateralAmountUserCurrency: bn(
          lendingQuoteData.quoteCollateralAmountFiatUserCurrency,
        ).toFixed(2),
        collateralAmountUsd: bn(lendingQuoteData.quoteCollateralAmountFiatUsd).toFixed(2),
        borrowedAmountUserCurrency: bn(lendingQuoteData.quoteBorrowedAmountUserCurrency).toFixed(2),
        borrowedAmountUsd: bn(lendingQuoteData.quoteBorrowedAmountUsd).toFixed(2),
        borrowedAmountCryptoPrecision: lendingQuoteData.quoteBorrowedAmountCryptoPrecision,
        debtAmountUserCurrency: bn(lendingQuoteData.quoteDebtAmountUserCurrency).toFixed(2),
        debtAmountUsd: bn(lendingQuoteData.quoteDebtAmountUsd).toFixed(2),
      }
      mixpanel.track(MixPanelEvent.BorrowPreview, eventData)
    }

    if (!isSweepNeeded) return history.push(BorrowRoutePaths.Confirm)
    history.push(BorrowRoutePaths.Sweep)
  }, [
    borrowAsset,
    borrowFeeAsset?.networkName,
    collateralAsset,
    collateralFeeAsset?.networkName,
    depositAmountCryptoPrecision,
    history,
    isSweepNeeded,
    lendingQuoteData,
    mixpanel,
  ])

  const collateralAssetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        assetId={collateralAssetId}
        assetIds={collateralAssetIds}
        isReadOnly
        isLoading={isSupportedCollateralAssetsLoading}
        onlyConnectedChains={true}
      />
    )
  }, [collateralAssetId, collateralAssetIds, isSupportedCollateralAssetsLoading])

  const borrowAssetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        assetId={borrowAsset?.assetId ?? ''}
        assetIds={borrowAssetIds}
        onAssetClick={handleBorrowAssetClick}
        onAssetChange={setBorrowAsset}
        isLoading={isSupportedBorrowAssetsLoading}
        onlyConnectedChains={true}
      />
    )
  }, [
    borrowAsset?.assetId,
    borrowAssetIds,
    setBorrowAsset,
    handleBorrowAssetClick,
    isSupportedBorrowAssetsLoading,
  ])

  const quoteErrorTranslation = useMemo(() => {
    if (!isThorchainLendingBorrowEnabled) return 'lending.errors.borrowingDisabled'
    if (isHardCapReached) return 'lending.errors.borrowingHalted'
    if (_isSmartContractAddress) return 'trade.errors.smartContractWalletNotSupported'
    if (
      !hasEnoughBalanceForTx ||
      (isLendingQuoteSuccess &&
        isEstimatedFeesDataSuccess &&
        collateralAsset &&
        ((isUtxoChainId(collateralAsset.chainId) && !hasEnoughBalanceForTxPlusSweep) ||
          !hasEnoughBalanceForTxPlusFees))
    )
      return 'common.insufficientFunds'
    if (isLendingQuoteError) {
      if (
        /not enough fee/.test(lendingQuoteError.message) ||
        /not enough to pay transaction fee/.test(lendingQuoteError.message)
      )
        return 'trade.errors.amountTooSmallUnknownMinimum'
      if (/trading is halted/.test(lendingQuoteError.message))
        return 'trade.errors.tradingNotActiveNoAssetSymbol'
    }
    return null
  }, [
    _isSmartContractAddress,
    collateralAsset,
    hasEnoughBalanceForTx,
    hasEnoughBalanceForTxPlusFees,
    hasEnoughBalanceForTxPlusSweep,
    isEstimatedFeesDataSuccess,
    isHardCapReached,
    isLendingQuoteError,
    isLendingQuoteSuccess,
    isThorchainLendingBorrowEnabled,
    lendingQuoteError?.message,
  ])

  const handleBorrowSubmit = useCallback(
    () => (isUnsafeQuote ? setShouldShowWarningAcknowledgement(true) : onSubmit()),
    [isUnsafeQuote, onSubmit],
  )

  if (!(collateralAsset && borrowAsset && collateralFeeAsset)) return null

  return (
    <SlideTransition>
      <WarningAcknowledgement
        message={translate('warningAcknowledgement.highSlippageBorrow', {
          slippagePercentage: bnOrZero(quoteSlippageDecimalPercentage)
            .times(100)
            .toFixed(2)
            .toString(),
        })}
        onAcknowledge={onSubmit}
        shouldShowAcknowledgement={shouldShowWarningAcknowledgement}
        setShouldShowAcknowledgement={setShouldShowWarningAcknowledgement}
      >
        <Stack spacing={0}>
          <TradeAssetInput
            accountId={collateralAccountId}
            assetId={collateralAssetId}
            assetSymbol={collateralAsset.symbol}
            assetIcon={collateralAsset.icon}
            onChange={handleDepositInputChange}
            onToggleIsFiat={toggleCollateralAssetIsFiat}
            isFiat={collateralAssetIsFiat}
            cryptoAmount={depositAmountCryptoPrecision ?? '0'}
            fiatAmount={fiatDepositAmount ?? '0'}
            isAccountSelectionDisabled={isAccountSelectionDisabled}
            isSendMaxDisabled={false}
            percentOptions={percentOptions}
            showInputSkeleton={false}
            showFiatSkeleton={false}
            label={translate('lending.depositAsset', { asset: collateralAsset.symbol })}
            onAccountIdChange={handleCollateralAccountIdChange}
            formControlProps={formControlProps}
            layout='inline'
            labelPostFix={collateralAssetSelectComponent}
          />
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
            assetId={borrowAsset?.assetId ?? ''}
            assetSymbol={borrowAsset.symbol}
            assetIcon={borrowAsset.icon}
            cryptoAmount={lendingQuoteData?.quoteBorrowedAmountCryptoPrecision ?? '0'}
            fiatAmount={lendingQuoteData?.quoteBorrowedAmountUserCurrency ?? '0'}
            isReadOnly
            onToggleIsFiat={toggleBorrowAssetIsFiat}
            isFiat={borrowAssetIsFiat}
            isSendMaxDisabled={false}
            percentOptions={percentOptions}
            showInputSkeleton={isLendingQuoteLoading || isLendingQuoteRefetching}
            showFiatSkeleton={isLendingQuoteLoading || isLendingQuoteRefetching}
            label={translate('lending.borrow')}
            onAccountIdChange={handleBorrowAccountIdChange}
            formControlProps={formControlProps}
            layout='inline'
            labelPostFix={borrowAssetSelectComponent}
          />
          <Collapse in={isLendingQuoteSuccess}>
            <LoanSummary
              confirmedQuote={confirmedQuote}
              isLoading={isLendingQuoteLoading || isLendingQuoteRefetching}
              collateralAssetId={collateralAssetId}
              collateralAccountId={collateralAccountId}
              debtOccuredAmountUserCurrency={lendingQuoteData?.quoteDebtAmountUserCurrency ?? '0'}
              depositAmountCryptoPrecision={depositAmountCryptoPrecision ?? '0'}
              borrowAssetId={borrowAsset?.assetId ?? ''}
              borrowAccountId={borrowAccountId}
            />
            <CardFooter
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
                  <Skeleton isLoaded={isLendingQuoteSuccess && !isLendingQuoteRefetching}>
                    <Amount.Crypto
                      value={lendingQuoteData?.quoteSlippageBorrowedAssetCryptoPrecision ?? '0'}
                      symbol={borrowAsset.symbol}
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
                      isLendingQuoteSuccess &&
                      !isLendingQuoteRefetching
                    }
                  >
                    <Amount.Fiat value={estimatedFeesData?.txFeeFiat ?? '0'} />
                  </Skeleton>
                </Row.Value>
              </Row>
              {isSweepNeeded && (
                <Row fontSize='sm' fontWeight='medium'>
                  <HelperTooltip label={translate('modals.send.consolidate.tooltip')}>
                    <Row.Label>{translate('modals.send.consolidate.consolidateFunds')}</Row.Label>
                  </HelperTooltip>
                  <Row.Value>
                    <Skeleton
                      isLoaded={Boolean(isEstimatedSweepFeesDataSuccess && estimatedSweepFeesData)}
                    >
                      <Amount.Fiat value={estimatedSweepFeesData?.txFeeFiat ?? '0'} />
                    </Skeleton>
                  </Row.Value>
                </Row>
              )}
              <Row fontSize='sm' fontWeight='medium'>
                <Row.Label>{translate('common.fees')}</Row.Label>
                <Row.Value>
                  <Skeleton isLoaded={isLendingQuoteSuccess && !isLendingQuoteRefetching}>
                    <Amount.Fiat value={lendingQuoteData?.quoteTotalFeesFiatUserCurrency ?? '0'} />
                  </Skeleton>
                </Row.Value>
              </Row>
              <Row fontSize='sm' fontWeight='medium'>
                <Row.Label>{translate('bridge.waitTimeLabel')}</Row.Label>
                <Row.Value>
                  <Skeleton isLoaded={isLendingQuoteSuccess && !isLendingQuoteRefetching}>
                    <RawText fontWeight='bold'>
                      {prettyMilliseconds(lendingQuoteData?.quoteTotalTimeMs ?? 0)}
                    </RawText>
                  </Skeleton>
                </Row.Value>
              </Row>
            </CardFooter>
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
            <Button
              size='lg-multiline'
              colorScheme={isLendingQuoteError || quoteErrorTranslation ? 'red' : 'blue'}
              mx={-2}
              onClick={handleBorrowSubmit}
              isLoading={
                isPoolDataLoading ||
                isLendingQuoteLoading ||
                isLendingQuoteRefetching ||
                isEstimatedFeesDataLoading ||
                isEstimatedSweepFeesDataLoading ||
                isEstimatedSweepFeesDataLoading ||
                isAddressByteCodeLoading ||
                isSweepNeededLoading
              }
              isDisabled={Boolean(
                isHardCapReached ||
                  !isThorchainLendingBorrowEnabled ||
                  bnOrZero(depositAmountCryptoPrecision).isZero() ||
                  isLendingQuoteError ||
                  isLendingQuoteLoading ||
                  isLendingQuoteRefetching ||
                  quoteErrorTranslation ||
                  isEstimatedFeesDataError ||
                  isEstimatedFeesDataLoading ||
                  disableSmartContractDeposit,
              )}
            >
              {quoteErrorTranslation
                ? translate(quoteErrorTranslation)
                : translate('lending.borrow')}
            </Button>
          </CardFooter>
        </Stack>
      </WarningAcknowledgement>
    </SlideTransition>
  )
}
