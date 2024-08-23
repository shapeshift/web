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
import { assertAndProcessMemo } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useQuery } from '@tanstack/react-query'
import prettyMilliseconds from 'pretty-ms'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { selectInboundAddressData } from 'react-queries/selectors'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { TradeAssetSelect } from 'components/AssetSelection/AssetSelection'
import { ButtonWalletPredicate } from 'components/ButtonWalletPredicate/ButtonWalletPredicate'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import { useApprove } from 'hooks/mutations/useApprove'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useIsSmartContractAddress } from 'hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { useModal } from 'hooks/useModal/useModal'
import { useToggle } from 'hooks/useToggle/useToggle'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { getMaybeCompositeAssetSymbol } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { useSendThorTx } from 'lib/utils/thorchain/hooks/useSendThorTx'
import type { LendingQuoteClose } from 'lib/utils/thorchain/lending/types'
import { useLendingQuoteCloseQuery } from 'pages/Lending/hooks/useLendingCloseQuery'
import { useLendingPositionData } from 'pages/Lending/hooks/useLendingPositionData'
import { useLendingSupportedAssets } from 'pages/Lending/hooks/useLendingSupportedAssets'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectAssets,
  selectFeeAssetById,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
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
  collateralAccountId: AccountId | null
  repaymentAccountId: AccountId | null
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

  const repaymentAccountNumberFilter = useMemo(
    () => ({ accountId: repaymentAccountId ?? '' }),
    [repaymentAccountId],
  )
  const repaymentAccountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, repaymentAccountNumberFilter),
  )

  const userAddress = useMemo(() => {
    if (!repaymentAccountId) return ''

    return fromAccountId(repaymentAccountId).account
  }, [repaymentAccountId])

  const { data: inboundAddressData, isLoading: isInboundAddressLoading } = useQuery({
    ...reactQueries.thornode.inboundAddresses(),
    staleTime: 60_000,
    select: data => selectInboundAddressData(data, repaymentAsset?.assetId),
    enabled: !!repaymentAsset?.assetId,
  })

  const {
    approveMutation: {
      mutate,
      isPending: isApprovalMutationPending,
      isSuccess: isApprovalMutationSuccess,
    },
    approvalFeesQuery: { data: approvalFeesData, isLoading: isApprovalFeesDataLoading },
    approvalTxHash,
    setApprovalTxHash,
    isApprovalRequired,
    allowanceDataQuery: { isLoading: isAllowanceDataLoading },
  } = useApprove({
    assetId: repaymentAsset?.assetId,
    spender: inboundAddressData?.router,
    from: userAddress,
    amountCryptoBaseUnit:
      confirmedQuote?.repaymentAmountCryptoPrecision && repaymentAsset
        ? toBaseUnit(
            // Add 5% buffer to the repayment allowance to avoid asset rates fluctuations ending up in more asset needed to repay
            bnOrZero(confirmedQuote.repaymentAmountCryptoPrecision).times('1.05'),
            repaymentAsset.precision,
          )
        : undefined,
    accountNumber: repaymentAccountNumber,
  })

  const useLendingQuoteCloseQueryArgs = useMemo(
    () => ({
      collateralAssetId,
      collateralAccountId,
      repaymentAssetId: repaymentAsset?.assetId ?? '',
      repaymentPercent,
      repaymentAccountId,
      // If we have an approval Txid, we don't want to refetch the quote
      // Else, they may get a worse rate i.e need to pay more token, meaning their approval wouldn't be valid
      // anymore for the new quote
      enabled: !isApprovalRequired,
    }),
    [
      collateralAccountId,
      collateralAssetId,
      isApprovalRequired,
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

  const repaymentAssetBalanceFilter = useMemo(
    () => ({ assetId: repaymentAsset?.assetId ?? '', accountId: repaymentAccountId ?? '' }),
    [repaymentAsset?.assetId, repaymentAccountId],
  )

  const repaymentAssetAmountAvailableCryptoPrecision = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, repaymentAssetBalanceFilter),
  )
  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: repaymentFeeAsset?.assetId ?? '', accountId: repaymentAccountId ?? '' }),
    [repaymentFeeAsset?.assetId, repaymentAccountId],
  )
  const feeAssetBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, feeAssetBalanceFilter),
  )

  const serializedApprovalTxIndex = useMemo(() => {
    if (!(approvalTxHash && userAddress && repaymentAccountId)) return ''
    return serializeTxIndex(repaymentAccountId, approvalTxHash, userAddress)
  }, [approvalTxHash, userAddress, repaymentAccountId])
  const approvalTx = useAppSelector(gs => selectTxById(gs, serializedApprovalTxIndex))
  const isApprovalTxPending = useMemo(
    () =>
      isApprovalMutationPending ||
      (isApprovalMutationSuccess && approvalTx?.status !== TxStatus.Confirmed),
    [approvalTx?.status, isApprovalMutationPending, isApprovalMutationSuccess],
  )

  useEffect(() => {
    if (!approvalTx) return
    if (isApprovalTxPending) return
    ;(async () => {
      await queryClient.invalidateQueries(
        reactQueries.common.allowanceCryptoBaseUnit(
          repaymentAsset?.assetId,
          inboundAddressData?.router,
          userAddress,
        ),
      )
    })()
  }, [
    approvalTx,
    inboundAddressData?.router,
    isApprovalTxPending,
    repaymentAsset?.assetId,
    userAddress,
  ])

  const handleApprove = useCallback(() => mutate(undefined), [mutate])

  const onSubmit = useCallback(() => {
    if (!lendingQuoteCloseData) return

    if (isApprovalRequired) return handleApprove()

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
    handleApprove,
    history,
    isApprovalRequired,
    lendingQuoteCloseData,
    mixpanel,
    repaymentAsset?.assetId,
    repaymentFeeAsset?.networkName,
    repaymentPercent,
    setConfirmedQuote,
  ])

  const swapIcon = useMemo(() => <ArrowDownIcon />, [])

  const { data: supportedRepaymentAssets, isLoading: isSupportedRepaymentAssetsLoading } =
    useLendingSupportedAssets({ type: 'borrow' })
  const repaymentAssetIds = useMemo(
    () => supportedRepaymentAssets?.map(asset => asset.assetId) ?? [],
    [supportedRepaymentAssets],
  )

  useEffect(() => {
    if (!(supportedRepaymentAssets && collateralAsset)) return
    if (repaymentAsset) return

    setRepaymentAsset(collateralAsset)
  }, [collateralAsset, supportedRepaymentAssets, repaymentAsset, setRepaymentAsset])

  const buyAssetSearch = useModal('buyAssetSearch')

  const handleRepaymentAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onAssetClick: setRepaymentAsset,
      title: 'lending.repay',
      assets: supportedRepaymentAssets ?? [],
    })
  }, [buyAssetSearch, supportedRepaymentAssets, setRepaymentAsset])

  const handleRepaymentAssetChange = useCallback(
    (asset: Asset) => {
      setRepaymentAsset(asset)
      setApprovalTxHash(null)
    },
    [setApprovalTxHash, setRepaymentAsset],
  )

  const repaymentAssetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        assetId={repaymentAsset?.assetId ?? ''}
        assetIds={repaymentAssetIds}
        onAssetClick={handleRepaymentAssetClick}
        onAssetChange={handleRepaymentAssetChange}
        // Users have the possibility to repay in any supported asset, not only their collateral/borrowed asset
        // https://docs.thorchain.org/thorchain-finance/lending#loan-repayment-closeflow
        isReadOnly={false}
        onlyConnectedChains={true}
      />
    )
  }, [
    repaymentAsset?.assetId,
    repaymentAssetIds,
    handleRepaymentAssetClick,
    handleRepaymentAssetChange,
  ])

  const collateralAssetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        assetId={collateralAssetId}
        isReadOnly
        isLoading={isSupportedRepaymentAssetsLoading}
        onlyConnectedChains={true}
      />
    )
  }, [collateralAssetId, isSupportedRepaymentAssetsLoading])

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

  const memo = useMemo(() => {
    if (!confirmedQuote) return null

    return assertAndProcessMemo(confirmedQuote.quoteMemo)
  }, [confirmedQuote])

  const hasEnoughBalanceForTx = useMemo(() => {
    if (!(repaymentFeeAsset && repaymentAsset)) return

    return bnOrZero(lendingQuoteCloseData?.repaymentAmountCryptoPrecision).lte(
      repaymentAssetAmountAvailableCryptoPrecision,
    )
  }, [
    repaymentFeeAsset,
    repaymentAsset,
    lendingQuoteCloseData,
    repaymentAssetAmountAvailableCryptoPrecision,
  ])

  const { estimatedFeesData, isEstimatedFeesDataLoading, isEstimatedFeesDataError } = useSendThorTx(
    {
      assetId: repaymentAsset?.assetId ?? '',
      accountId: repaymentAccountId,
      amountCryptoBaseUnit: toBaseUnit(
        confirmedQuote?.repaymentAmountCryptoPrecision ?? 0,
        repaymentAsset?.precision ?? 0,
      ),
      memo,
      // no explicit from address required for repayments
      fromAddress: '',
      action: 'repayLoan',
      enableEstimateFees: isApprovalRequired === false,
    },
  )

  const fees = useMemo(
    () => approvalFeesData || estimatedFeesData,
    [approvalFeesData, estimatedFeesData],
  )

  const hasEnoughBalanceForTxPlusFees = useMemo(() => {
    if (!(repaymentFeeAsset && repaymentAsset)) return

    if (!fees) return true

    // Native asset
    if (repaymentFeeAsset.assetId === repaymentAsset.assetId)
      return bnOrZero(lendingQuoteCloseData?.repaymentAmountCryptoPrecision)
        .plus(
          bnOrZero(estimatedFeesData?.txFeeCryptoBaseUnit).div(
            bn(10).pow(repaymentAsset.precision ?? '0'),
          ),
        )
        .lte(repaymentAssetAmountAvailableCryptoPrecision)

    // Token - fees can either be network fees or approval fees
    const txFeeCryptoBaseUnit =
      'txFeeCryptoBaseUnit' in fees ? fees.txFeeCryptoBaseUnit : fees.networkFeeCryptoBaseUnit
    return (
      bnOrZero(lendingQuoteCloseData?.repaymentAmountCryptoPrecision).lte(
        repaymentAssetAmountAvailableCryptoPrecision,
      ) && bnOrZero(txFeeCryptoBaseUnit).lte(feeAssetBalanceCryptoBaseUnit)
    )
  }, [
    repaymentFeeAsset,
    repaymentAsset,
    fees,
    lendingQuoteCloseData?.repaymentAmountCryptoPrecision,
    estimatedFeesData?.txFeeCryptoBaseUnit,
    repaymentAssetAmountAvailableCryptoPrecision,
    feeAssetBalanceCryptoBaseUnit,
  ])

  const { data: _isSmartContractAddress, isLoading: isAddressByteCodeLoading } =
    useIsSmartContractAddress(userAddress, repaymentAsset?.chainId ?? '')

  const disableSmartContractRepayment = useMemo(() => {
    // This is either a smart contract address, or the bytecode is still loading - disable confirm
    if (_isSmartContractAddress) return true

    // All checks passed - this is an EOA address
    return false
  }, [_isSmartContractAddress])

  const quoteErrorTranslation = useMemo(() => {
    if (!isThorchainLendingRepayEnabled) return translate('lending.errors.repaymentsDisabled')
    if (_isSmartContractAddress) return translate('trade.errors.smartContractWalletNotSupported')
    if (lendingQuoteCloseData && (!hasEnoughBalanceForTxPlusFees || !hasEnoughBalanceForTx))
      return translate('common.insufficientFunds')
    if (isLendingQuoteCloseError) {
      if (
        /not enough fee/i.test(lendingQuoteCloseError.message) ||
        /not enough to pay transaction fee/i.test(lendingQuoteCloseError.message)
      )
        return translate(
          repaymentPercent === 100
            ? 'lending.errors.amountTooLowToReturnCollateral'
            : 'trade.errors.amountTooSmallUnknownMinimum',
        )
      if (
        /loan hasn't reached maturity/i.test(lendingQuoteCloseError.message) ||
        /loan repayment is unavailable/i.test(lendingQuoteCloseError.message)
      )
        return translate('lending.repaymentUnavailable')

      if (/trading is halted/i.test(lendingQuoteCloseError.message))
        return translate('lending.errors.repaymentsHalted')

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
    lendingQuoteCloseData,
    lendingQuoteCloseError?.message,
    repaymentPercent,
    translate,
  ])

  const quoteErrorTooltipTranslation = useMemo(() => {
    if (!isLendingQuoteCloseError) return null

    if (
      /not enough fee/i.test(lendingQuoteCloseError.message) ||
      /not enough to pay transaction fee/i.test(lendingQuoteCloseError.message)
    )
      return translate(
        repaymentPercent === 100
          ? 'lending.errors.amountTooLowToReturnCollateralTooltip'
          : 'lending.errors.amountTooSmallUnknownMinimumTooltip',
      )
    if (
      /loan hasn't reached maturity/i.test(lendingQuoteCloseError.message) ||
      /loan repayment is unavailable/i.test(lendingQuoteCloseError.message)
    )
      return translate('lending.errors.repaymentUnavailableTooltip')

    if (/trading is halted/i.test(lendingQuoteCloseError.message))
      return translate('lending.errors.repaymentsHaltedTooltip')
  }, [isLendingQuoteCloseError, lendingQuoteCloseError?.message, repaymentPercent, translate])

  const confirmTranslation = useMemo(() => {
    if (isApprovalRequired && repaymentAsset)
      return translate(`transactionRow.parser.erc20.approveSymbol`, {
        symbol: repaymentAsset.symbol,
      })
    return translate('lending.repay')
  }, [isApprovalRequired, repaymentAsset, translate])

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
        showFiatSkeleton={isLendingQuoteCloseLoading || isLendingQuoteCloseRefetching}
        label={translate('lending.repayAmount')}
        onAccountIdChange={handleRepaymentAccountIdChange}
        formControlProps={formControlProps}
        layout='inline'
        labelPostFix={repaymentAssetSelectComponent}
        hideAmounts={isLendingQuoteCloseError}
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
        accountId={collateralAccountId ?? ''}
        assetId={collateralAssetId}
        assetSymbol={collateralAsset?.symbol ?? ''}
        assetIcon={collateralAsset?.icon ?? ''}
        // Both cryptoAmount and fiatAmount actually defined at display time, see showFiatSkeleton below
        cryptoAmount={lendingQuoteCloseData?.quoteWithdrawnAmountAfterFeesCryptoPrecision ?? '0'}
        fiatAmount={lendingQuoteCloseData?.quoteWithdrawnAmountAfterFeesUserCurrency ?? '0'}
        isAccountSelectionDisabled={isAccountSelectionDisabled}
        isSendMaxDisabled={false}
        percentOptions={percentOptions}
        showInputSkeleton={isLendingQuoteCloseLoading || isLendingQuoteCloseRefetching}
        showFiatSkeleton={isLendingQuoteCloseLoading || isLendingQuoteCloseRefetching}
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
      <Collapse in={isLendingQuoteCloseSuccess} unmountOnExit>
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
          repaymentAccountId={repaymentAccountId ?? ''}
          collateralAccountId={collateralAccountId ?? ''}
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
                  value={lendingQuoteCloseData?.quoteSlippageWithdrawnAssetCryptoPrecision ?? '0'}
                  symbol={collateralAsset?.symbol ?? ''}
                />
              </Skeleton>
            </Row.Value>
          </Row>
          <Skeleton isLoaded={Boolean(fees)}>
            <Row fontSize='sm' fontWeight='medium'>
              <Row.Label>
                {translate(isApprovalRequired ? 'common.approvalFee' : 'common.gasFee')}
              </Row.Label>
              <Row.Value>
                {/* Nested skeleton on purpose - approval required may be detected, but fees still fetching */}
                <Skeleton isLoaded={Boolean(fees)}>
                  <Amount.Fiat value={fees?.txFeeFiat ?? '0'} />
                </Skeleton>
              </Row.Value>
            </Row>
          </Skeleton>
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
        <Tooltip
          label={translate(quoteErrorTooltipTranslation)}
          isDisabled={!lendingQuoteCloseError}
        >
          <ButtonWalletPredicate
            isValidWallet={!disableSmartContractRepayment}
            isDisabled={Boolean(
              !isThorchainLendingRepayEnabled ||
                isApprovalTxPending ||
                isInboundAddressLoading ||
                isAllowanceDataLoading ||
                isLendingPositionDataLoading ||
                isLendingPositionDataError ||
                isLendingQuoteCloseLoading ||
                isLendingQuoteCloseRefetching ||
                isEstimatedFeesDataLoading ||
                isApprovalFeesDataLoading ||
                isLendingQuoteCloseError ||
                isEstimatedFeesDataError ||
                quoteErrorTranslation,
            )}
            size='lg-multiline'
            colorScheme={
              isLendingQuoteCloseError || isEstimatedFeesDataError || quoteErrorTranslation
                ? 'red'
                : 'blue'
            }
            mx={-2}
            onClick={onSubmit}
            isLoading={
              isApprovalTxPending ||
              isLendingPositionDataLoading ||
              isLendingQuoteCloseLoading ||
              isLendingQuoteCloseRefetching ||
              isEstimatedFeesDataLoading ||
              isApprovalFeesDataLoading ||
              isAddressByteCodeLoading ||
              isInboundAddressLoading ||
              isAllowanceDataLoading
            }
          >
            {quoteErrorTranslation ? quoteErrorTranslation : confirmTranslation}
          </ButtonWalletPredicate>
        </Tooltip>
      </Stack>
    </Stack>
  )
}
