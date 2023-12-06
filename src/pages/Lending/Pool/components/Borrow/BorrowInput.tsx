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
import noop from 'lodash/noop'
import prettyMilliseconds from 'pretty-ms'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { TradeAssetSelect } from 'components/MultiHopTrade/components/AssetSelection'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { useIsSmartContractAddress } from 'hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { getThorchainFromAddress } from 'lib/utils/thorchain'
import { getThorchainLendingPosition } from 'lib/utils/thorchain/lending'
import type { LendingQuoteOpen } from 'lib/utils/thorchain/lending/types'
import { useGetEstimatedFeesQuery } from 'pages/Lending/hooks/useGetEstimatedFeesQuery'
import { useIsSweepNeededQuery } from 'pages/Lending/hooks/useIsSweepNeededQuery'
import { useLendingQuoteOpenQuery } from 'pages/Lending/hooks/useLendingQuoteQuery'
import { useLendingSupportedAssets } from 'pages/Lending/hooks/useLendingSupportedAssets'
import { useQuoteEstimatedFeesQuery } from 'pages/Lending/hooks/useQuoteEstimatedFees'
import {
  selectAssetById,
  selectFeeAssetById,
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
  const [fromAddress, setFromAddress] = useState<string | null>(null)

  const {
    state: { wallet },
  } = useWallet()
  const translate = useTranslate()
  const history = useHistory()

  const { data: borrowAssets } = useLendingSupportedAssets({ type: 'borrow' })

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
      onClick: setBorrowAsset,
      title: 'lending.borrow',
      assets: borrowAssets,
    })
  }, [borrowAssets, buyAssetSearch, setBorrowAsset])

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
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, collateralAssetId))

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId ?? '', accountId: collateralAccountId }),
    [collateralAccountId, feeAsset?.assetId],
  )
  const feeAssetBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, feeAssetBalanceFilter),
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
    if (!(isEstimatedFeesDataSuccess && feeAsset)) return false

    // This is a native asset, so we can deduct the fees from the value
    if (feeAsset.assetId === collateralAssetId)
      return bnOrZero(depositAmountCryptoPrecision)
        .plus(fromBaseUnit(estimatedFeesData.txFeeCryptoBaseUnit, collateralAsset?.precision ?? 0))
        .lte(amountAvailableCryptoPrecision)

    return (
      bnOrZero(depositAmountCryptoPrecision).lte(amountAvailableCryptoPrecision) &&
      bnOrZero(estimatedFeesData.txFeeCryptoBaseUnit).lte(feeAssetBalanceCryptoBaseUnit)
    )
  }, [
    amountAvailableCryptoPrecision,
    collateralAsset?.precision,
    collateralAssetId,
    depositAmountCryptoPrecision,
    estimatedFeesData?.txFeeCryptoBaseUnit,
    feeAsset,
    feeAssetBalanceCryptoBaseUnit,
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
          hasEnoughBalanceForTxPlusFees,
      ),
    }),
    [
      collateralAsset?.precision,
      collateralAssetId,
      depositAmountCryptoPrecision,
      estimatedFeesData?.txFeeCryptoBaseUnit,
      fromAddress,
      hasEnoughBalanceForTxPlusFees,
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

  useEffect(() => {
    setConfirmedQuote(lendingQuoteData ?? null)
  }, [isLendingQuoteSuccess, lendingQuoteData, setConfirmedQuote])

  const userAddress = useMemo(() => {
    if (!collateralAccountId) return ''

    return fromAccountId(collateralAccountId).account
  }, [collateralAccountId])

  const { data: _isSmartContractAddress, isLoading: isAddressByteCodeLoading } =
    useIsSmartContractAddress(userAddress)

  const disableSmartContractDeposit = useMemo(() => {
    // This is either a smart contract address, or the bytecode is still loading - disable confirm
    if (_isSmartContractAddress !== false) return true

    // All checks passed - this is an EOA address
    return false
  }, [_isSmartContractAddress])

  const onSubmit = useCallback(() => {
    if (!lendingQuoteData) return
    if (!isSweepNeeded) return history.push(BorrowRoutePaths.Confirm)
    history.push(BorrowRoutePaths.Sweep)
  }, [history, isSweepNeeded, lendingQuoteData])

  const collateralAssetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        assetId={collateralAssetId}
        onAssetClick={noop}
        onAssetChange={handleAssetChange}
        isReadOnly
      />
    )
  }, [collateralAssetId, handleAssetChange])

  const borrowAssetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        assetId={borrowAsset?.assetId ?? ''}
        onAssetClick={handleBorrowAssetClick}
        onAssetChange={handleAssetChange}
      />
    )
  }, [borrowAsset?.assetId, handleAssetChange, handleBorrowAssetClick])

  const quoteErrorTranslation = useMemo(() => {
    if (_isSmartContractAddress) return 'trade.errors.smartContractWalletNotSupported'
    if (
      !hasEnoughBalanceForTx ||
      (isLendingQuoteSuccess && isEstimatedFeesDataSuccess && !hasEnoughBalanceForTxPlusSweep)
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
    hasEnoughBalanceForTx,
    hasEnoughBalanceForTxPlusSweep,
    isEstimatedFeesDataSuccess,
    isLendingQuoteError,
    isLendingQuoteSuccess,
    lendingQuoteError?.message,
  ])

  if (!(collateralAsset && borrowAsset && feeAsset)) return null

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
                    isEstimatedFeesDataSuccess && isLendingQuoteSuccess && !isLendingQuoteRefetching
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
            size='lg'
            colorScheme={isLendingQuoteError || quoteErrorTranslation ? 'red' : 'blue'}
            mx={-2}
            onClick={onSubmit}
            isLoading={
              isLendingQuoteLoading ||
              isLendingQuoteRefetching ||
              isEstimatedFeesDataLoading ||
              isEstimatedSweepFeesDataLoading ||
              isEstimatedSweepFeesDataLoading ||
              isSweepNeededLoading ||
              isAddressByteCodeLoading
            }
            isDisabled={Boolean(
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
            {quoteErrorTranslation ? translate(quoteErrorTranslation) : translate('lending.borrow')}
          </Button>
        </CardFooter>
      </Stack>
    </SlideTransition>
  )
}
