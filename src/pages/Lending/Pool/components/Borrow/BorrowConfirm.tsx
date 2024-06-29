import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  CardFooter,
  CardHeader,
  Divider,
  Flex,
  Heading,
  Progress,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { Asset } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation, useMutationState } from '@tanstack/react-query'
import dayjs from 'dayjs'
import prettyMilliseconds from 'pretty-ms'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetToAsset } from 'components/AssetToAsset/AssetToAsset'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import { useInterval } from 'hooks/useInterval/useInterval'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { getMaybeCompositeAssetSymbol } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { getThorchainFromAddress, waitForThorchainUpdate } from 'lib/utils/thorchain'
import { useSendThorTx } from 'lib/utils/thorchain/hooks/useSendThorTx'
import { getThorchainLendingPosition } from 'lib/utils/thorchain/lending'
import type { LendingQuoteOpen } from 'lib/utils/thorchain/lending/types'
import { addLimitToMemo } from 'lib/utils/thorchain/memo/addLimitToMemo'
import { useLendingQuoteOpenQuery } from 'pages/Lending/hooks/useLendingQuoteQuery'
import {
  selectAssetById,
  selectAssets,
  selectFeeAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

import { LoanSummary } from '../LoanSummary'
import { BorrowRoutePaths } from './types'

type BorrowConfirmProps = {
  collateralAssetId: AssetId
  depositAmountCryptoPrecision: string | null
  setDepositAmount: (amount: string | null) => void
  collateralAccountId: AccountId | null
  borrowAccountId: AccountId
  borrowAsset: Asset | null
  txId: string | null
  setTxid: (txId: string | null) => void
  confirmedQuote: LendingQuoteOpen | null
  setConfirmedQuote: (quote: LendingQuoteOpen | null) => void
}

export const BorrowConfirm = ({
  collateralAssetId,
  depositAmountCryptoPrecision,
  collateralAccountId,
  borrowAccountId,
  borrowAsset,
  txId,
  setTxid,
  confirmedQuote,
  setConfirmedQuote,
  setDepositAmount,
}: BorrowConfirmProps) => {
  const [isLoanPending, setIsLoanPending] = useState(false)
  const [isQuoteExpired, setIsQuoteExpired] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [fromAddress, setFromAddress] = useState<string | null>(null)

  const {
    state: { wallet },
  } = useWallet()

  const borrowAssetId = borrowAsset?.assetId ?? ''
  const history = useHistory()
  const translate = useTranslate()

  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))
  const debtAsset = useAppSelector(state => selectAssetById(state, borrowAssetId))
  const collateralFeeAsset = useAppSelector(state => selectFeeAssetById(state, collateralAssetId))
  const borrowFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, borrowAsset?.assetId ?? ''),
  )

  const collateralAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, collateralAssetId),
  )
  const { mutateAsync } = useMutation({
    mutationKey: [txId],
    mutationFn: async ({
      txId: _txId,
      expectedCompletionTime,
    }: {
      txId: string
      expectedCompletionTime?: number
    }) => {
      // Ensuring we wait for the outbound Tx to exist
      // Else, the position will update before the borrowed asset is received and users will be confused
      await waitForThorchainUpdate({ txId: _txId, skipOutbound: false, expectedCompletionTime })
        .promise
      queryClient.invalidateQueries({ queryKey: ['thorchainLendingPosition'], exact: false })
    },
  })

  const lendingMutationStatus = useMutationState({
    filters: { mutationKey: [txId] },
    select: mutation => mutation.state.status,
  })

  const lendingMutationSubmittedAt = useMutationState({
    filters: { mutationKey: [txId] },
    select: mutation => mutation.state.submittedAt,
  })

  const loanTxStatus = useMemo(() => lendingMutationStatus?.[0], [lendingMutationStatus])

  const swapStatus = useMemo(() => {
    if (loanTxStatus === 'success') return TxStatus.Confirmed
    if (loanTxStatus === 'pending') return TxStatus.Pending
    return TxStatus.Unknown
  }, [loanTxStatus])

  const mixpanel = getMixPanel()
  const eventData = useMemo(() => {
    if (!confirmedQuote) return {}

    const assets = selectAssets(store.getState())
    const compositeBorrowAsset = getMaybeCompositeAssetSymbol(borrowAsset?.assetId ?? '', assets)
    const compositeCollateralAsset = getMaybeCompositeAssetSymbol(collateralAssetId ?? '', assets)

    return {
      borrowAsset: compositeBorrowAsset,
      collateralAsset: compositeCollateralAsset,
      borrowAssetChain: borrowFeeAsset?.networkName,
      collateralAssetChain: collateralFeeAsset?.networkName,
      totalFeesUserCurrency: bn(confirmedQuote.quoteTotalFeesFiatUserCurrency).toFixed(2),
      totalFeesUsd: bn(confirmedQuote.quoteTotalFeesFiatUsd).toFixed(2),
      depositAmountCryptoPrecision,
      collateralAmountCryptoPrecision: confirmedQuote.quoteCollateralAmountCryptoPrecision,
      collateralAmountUserCurrency: bn(
        confirmedQuote.quoteCollateralAmountFiatUserCurrency,
      ).toFixed(2),
      collateralAmountUsd: bn(confirmedQuote.quoteCollateralAmountFiatUsd).toFixed(2),
      borrowedAmountUserCurrency: bn(confirmedQuote.quoteBorrowedAmountUserCurrency).toFixed(2),
      borrowedAmountUsd: bn(confirmedQuote.quoteBorrowedAmountUsd).toFixed(2),
      borrowedAmountCryptoPrecision: confirmedQuote.quoteBorrowedAmountCryptoPrecision,
      debtAmountUserCurrency: bn(confirmedQuote.quoteDebtAmountUserCurrency).toFixed(2),
      debtAmountUsd: bn(confirmedQuote.quoteDebtAmountUsd).toFixed(2),
    }
  }, [
    borrowAsset?.assetId,
    borrowFeeAsset?.networkName,
    collateralAssetId,
    collateralFeeAsset?.networkName,
    confirmedQuote,
    depositAmountCryptoPrecision,
  ])

  const collateralAccountFilter = useMemo(
    () => ({ accountId: collateralAccountId ?? '' }),
    [collateralAccountId],
  )
  const collateralAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, collateralAccountFilter),
  )

  useEffect(() => {
    if (!(wallet && collateralAccountMetadata !== undefined && collateralAccountId?.length)) return

    getThorchainFromAddress({
      accountId: collateralAccountId,
      getPosition: getThorchainLendingPosition,
      assetId: collateralAssetId,
      wallet,
      accountMetadata: collateralAccountMetadata,
    }).then(setFromAddress)
  }, [collateralAccountId, collateralAccountMetadata, collateralAssetId, wallet])

  useEffect(() => {
    // don't start polling until we have a tx
    if (!txId) return
    if (!confirmedQuote) return
    ;(async () => {
      const expectedCompletionTime = dayjs()
        .add(confirmedQuote.quoteTotalTimeMs, 'millisecond')
        .unix()
      await mutateAsync({ txId, expectedCompletionTime })
      mixpanel?.track(MixPanelEvent.BorrowSuccess, eventData)
      setIsLoanPending(false)
    })()
  }, [confirmedQuote, eventData, mixpanel, mutateAsync, txId])

  const handleBack = useCallback(() => {
    history.push(BorrowRoutePaths.Input)
  }, [history])
  const divider = useMemo(() => <Divider />, [])

  const chainAdapter = getChainAdapterManager().get(fromAssetId(collateralAssetId).chainId)

  const useLendingQuoteQueryArgs = useMemo(
    () => ({
      // Refetching at confirm step should only be done programmatically with refetch if a quote expires and a user clicks "Refetch Quote"
      enabled: false,
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

  const { refetch: refetchLendingQuote, isRefetching: isLendingQuoteRefetching } =
    useLendingQuoteOpenQuery(useLendingQuoteQueryArgs)

  const isLendingQuoteSuccess = Boolean(confirmedQuote)

  const memo = useMemo(() => {
    if (!confirmedQuote) return null

    // In theory, no need for slippage deduction here - quoteBorrowedAmountThorBaseUnit (expected_amount_out) already is quote.fees.slippage_bps deducted
    // But things get weirder, see below.
    // const minDebtAmount = confirmedQuote.quoteBorrowedAmountThorBaseUnit
    // NOTE: We currently add a limit of '' (empty component) here, because loans are weird. There is some magical component in them using internal streaming swaps unless a limit
    // is set. There is also no `expected_amount_out_streaming` field in the quote, only `expected_amount_out` (which assumes streaming).
    // Meaning trying to use the `expected_amount_out` as a limit will yield a slightly worse rate, and result in a refund.
    // TODO(gomes): after this PR goes in, we should add some slippage component here similar to swapper with a sane, default slippage.
    // Said slippage should be high enough to account for the worsening of rate from streaming -> non-streaming, but low enough to not be a significant loss.
    return addLimitToMemo({ memo: confirmedQuote.quoteMemo, limit: '0' })
  }, [confirmedQuote])

  const { executeTransaction, estimatedFeesData, isEstimatedFeesDataLoading } = useSendThorTx({
    assetId: collateralAssetId,
    accountId: collateralAccountId,
    amountCryptoBaseUnit: toBaseUnit(
      depositAmountCryptoPrecision ?? '0',
      collateralAsset?.precision ?? 0,
    ),
    memo,
    fromAddress,
    action: 'openLoan',
    disableEstimateFeesRefetch: isLoanPending,
  })

  const handleConfirm = useCallback(async () => {
    if (!confirmedQuote) return

    if (isQuoteExpired) {
      const { data: refetchedQuote } = await refetchLendingQuote()
      setConfirmedQuote(refetchedQuote ?? null)
      return
    }

    if (loanTxStatus === 'pending') return // no-op

    if (loanTxStatus === 'success') {
      // Reset values when going back to input step
      setTxid(null)
      setConfirmedQuote(null)
      setDepositAmount(null)
      return history.push(BorrowRoutePaths.Input)
    }

    if (
      !(
        collateralAssetId &&
        depositAmountCryptoPrecision &&
        wallet &&
        chainAdapter &&
        isLendingQuoteSuccess &&
        estimatedFeesData &&
        collateralAccountMetadata &&
        borrowAsset &&
        collateralAsset
      )
    )
      return

    setIsLoanPending(true)

    mixpanel?.track(MixPanelEvent.BorrowConfirm, eventData)

    const _txId = await executeTransaction()
    if (!_txId) throw new Error('failed to broadcast transaction')

    setTxid(_txId)
  }, [
    confirmedQuote,
    isQuoteExpired,
    loanTxStatus,
    collateralAssetId,
    depositAmountCryptoPrecision,
    wallet,
    chainAdapter,
    isLendingQuoteSuccess,
    estimatedFeesData,
    collateralAccountMetadata,
    borrowAsset,
    collateralAsset,
    mixpanel,
    eventData,
    executeTransaction,
    refetchLendingQuote,
    setConfirmedQuote,
    setTxid,
    setDepositAmount,
    history,
  ])

  // Quote expiration interval
  useInterval(() => {
    // This should never happen but it may
    if (!confirmedQuote) return

    // Since we run this interval check every second, subtract a few seconds to avoid
    // off-by-one on the last second as well as the main thread being overloaded and running slow
    const quoteExpiryUnix = dayjs.unix(confirmedQuote.quoteExpiry).subtract(5, 'second').unix()

    const isExpired = dayjs.unix(quoteExpiryUnix).isBefore(dayjs())
    setIsQuoteExpired(isExpired)
  }, 1000)

  // Elapsed time interval
  useInterval(() => {
    if (!loanTxStatus || !txId || !confirmedQuote) return
    if (!lendingMutationSubmittedAt[0]) return

    const submittedAt = lendingMutationSubmittedAt[0]
    const newElapsedTime = dayjs().diff(dayjs(submittedAt))

    if (newElapsedTime >= confirmedQuote.quoteTotalTimeMs) {
      setElapsedTime(confirmedQuote.quoteTotalTimeMs)
    } else {
      setElapsedTime(newElapsedTime)
    }
  }, 1000)
  const confirmTranslation = useMemo(() => {
    if (isQuoteExpired) return 'lending.refetchQuote'

    return loanTxStatus === 'success' ? 'lending.borrowAgain' : 'lending.confirmAndBorrow'
  }, [isQuoteExpired, loanTxStatus])

  const maybeLedgerOpenAppWarning = useMemo(() => {
    if (!wallet || !isLedger(wallet)) return null

    const chain = (() => {
      if (!chainAdapter) return ''
      // All EVM chains are managed using the Ethereum app on Ledger
      if (isEvmChainId(fromAssetId(collateralAssetId).chainId)) return 'Ethereum'
      return chainAdapter?.getDisplayName()
    })()

    return (
      <Alert status='info'>
        <AlertIcon />
        <AlertDescription>
          <Text
            // eslint is drunk, this whole JSX expression is already memoized
            // eslint-disable-next-line react-memo/require-usememo
            translation={['walletProvider.ledger.signWarning', { chain }]}
          />
        </AlertDescription>
      </Alert>
    )
  }, [chainAdapter, collateralAssetId, wallet])

  if (!depositAmountCryptoPrecision || !chainAdapter) return null

  return (
    <SlideTransition>
      <Flex flexDir='column' width='full'>
        <CardHeader>
          <WithBackButton onBack={handleBack}>
            <Heading as='h5' textAlign='center'>
              <Text translation='Confirm' />
            </Heading>
          </WithBackButton>
        </CardHeader>
        <Stack spacing={0} divider={divider}>
          <Stack spacing={0} pb={4}>
            <AssetToAsset
              buyIcon={debtAsset?.icon ?? ''}
              sellIcon={collateralAsset?.icon ?? ''}
              buyColor={debtAsset?.color ?? ''}
              sellColor={collateralAsset?.color ?? ''}
              status={swapStatus}
              px={6}
              mb={4}
            />
            <Flex px={6}>
              <Progress
                width='full'
                borderRadius='full'
                size='sm'
                min={0}
                max={confirmedQuote?.quoteTotalTimeMs ?? 0}
                value={elapsedTime}
                hasStripe
                isAnimated={loanTxStatus === 'pending'}
                colorScheme={loanTxStatus === 'success' ? 'green' : 'blue'}
              />
            </Flex>
          </Stack>
          <Stack py={4} spacing={4} px={6} fontSize='sm' fontWeight='medium'>
            <RawText fontWeight='bold'>{translate('lending.transactionInfo')}</RawText>
            <Row>
              <Row.Label>{translate('common.send')}</Row.Label>
              <Row.Value textAlign='right'>
                <Skeleton isLoaded={isLendingQuoteSuccess && !isLendingQuoteRefetching}>
                  <Stack spacing={1} flexDir='row' flexWrap='wrap'>
                    <Amount.Crypto
                      value={depositAmountCryptoPrecision}
                      symbol={collateralAsset?.symbol ?? ''}
                    />
                    <Amount.Fiat
                      color='text.subtle'
                      value={bnOrZero(depositAmountCryptoPrecision)
                        .times(collateralAssetMarketData?.price ?? '0')
                        .toString()}
                      prefix='≈'
                    />
                  </Stack>
                </Skeleton>
              </Row.Value>
            </Row>
            <Row>
              <Row.Label>{translate('common.receive')}</Row.Label>
              <Row.Value textAlign='right'>
                <Skeleton isLoaded={isLendingQuoteSuccess && !isLendingQuoteRefetching}>
                  <Stack spacing={1} flexDir='row' flexWrap='wrap'>
                    <Amount.Crypto
                      // Actually defined at display time, see isLoaded above
                      value={confirmedQuote?.quoteBorrowedAmountCryptoPrecision ?? '0'}
                      symbol={debtAsset?.symbol ?? ''}
                    />
                    <Amount.Fiat
                      color='text.subtle'
                      // Actually defined at display time, see isLoaded above
                      value={confirmedQuote?.quoteBorrowedAmountUserCurrency ?? '0'}
                      prefix='≈'
                    />
                  </Stack>
                </Skeleton>
              </Row.Value>
            </Row>
            <Row fontSize='sm' fontWeight='medium'>
              <HelperTooltip label={translate('lending.quote.feesPlusSlippage')}>
                <Row.Label>{translate('common.feesPlusSlippage')}</Row.Label>
              </HelperTooltip>
              <Row.Value>
                <Skeleton isLoaded={isLendingQuoteSuccess && !isLendingQuoteRefetching}>
                  {/* Actually defined at display time, see isLoaded above */}
                  <Amount.Fiat value={confirmedQuote?.quoteTotalFeesFiatUserCurrency ?? '0'} />
                </Skeleton>
              </Row.Value>
            </Row>
            <Row fontSize='sm' fontWeight='medium'>
              <Row.Label>{translate('common.gasFee')}</Row.Label>
              <Row.Value>
                <Skeleton
                  isLoaded={
                    !isEstimatedFeesDataLoading &&
                    estimatedFeesData &&
                    isLendingQuoteSuccess &&
                    !isLendingQuoteRefetching
                  }
                >
                  {/* Actually defined at display time, see isLoaded above */}
                  <Amount.Fiat value={estimatedFeesData?.txFeeFiat ?? '0'} />
                </Skeleton>
              </Row.Value>
            </Row>
            <Row fontSize='sm' fontWeight='medium'>
              <Row.Label>{translate('bridge.waitTimeLabel')}</Row.Label>
              <Row.Value>
                <Skeleton isLoaded={isLendingQuoteSuccess && !isLendingQuoteRefetching}>
                  <RawText fontWeight='bold'>
                    {prettyMilliseconds(confirmedQuote?.quoteTotalTimeMs ?? 0)}
                  </RawText>
                </Skeleton>
              </Row.Value>
            </Row>
          </Stack>
          <LoanSummary
            confirmedQuote={confirmedQuote}
            borderTopWidth={0}
            mt={0}
            collateralAssetId={collateralAssetId}
            collateralAccountId={collateralAccountId}
            debtOccuredAmountUserCurrency={confirmedQuote?.quoteDebtAmountUserCurrency ?? '0'}
            borrowAssetId={borrowAssetId}
            borrowAccountId={borrowAccountId}
            depositAmountCryptoPrecision={depositAmountCryptoPrecision ?? '0'}
          />
          <CardFooter px={4} py={4}>
            <Stack spacing={4} width='full'>
              {maybeLedgerOpenAppWarning && <Box width='full'>{maybeLedgerOpenAppWarning}</Box>}
              <Box width='full'>
                <Button
                  colorScheme='blue'
                  size='lg'
                  width='full'
                  onClick={handleConfirm}
                  isLoading={
                    isLoanPending ||
                    isLendingQuoteRefetching ||
                    loanTxStatus === 'pending' ||
                    isEstimatedFeesDataLoading ||
                    !confirmedQuote
                  }
                  disabled={
                    loanTxStatus === 'pending' ||
                    isLoanPending ||
                    isEstimatedFeesDataLoading ||
                    !confirmedQuote
                  }
                >
                  {translate(confirmTranslation)}
                </Button>
              </Box>
            </Stack>
          </CardFooter>
        </Stack>
      </Flex>
    </SlideTransition>
  )
}
