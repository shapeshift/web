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
import { FeeDataKey, isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { Asset, KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation, useMutationState } from '@tanstack/react-query'
import dayjs from 'dayjs'
import prettyMilliseconds from 'pretty-ms'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useQuoteEstimatedFeesQuery } from 'react-queries/hooks/useQuoteEstimatedFeesQuery'
import { useHistory } from 'react-router'
import { toHex } from 'viem'
import { Amount } from 'components/Amount/Amount'
import { AssetToAsset } from 'components/AssetToAsset/AssetToAsset'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import type { SendInput } from 'components/Modals/Send/Form'
import { handleSend } from 'components/Modals/Send/utils'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import { useInterval } from 'hooks/useInterval/useInterval'
import { useLedgerOpenApp } from 'hooks/useLedgerOpenApp/useLedgerOpenApp'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { getMaybeCompositeAssetSymbol } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { getSupportedEvmChainIds } from 'lib/utils/evm'
import { getThorchainFromAddress, waitForThorchainUpdate } from 'lib/utils/thorchain'
import { getThorchainLendingPosition } from 'lib/utils/thorchain/lending'
import type { LendingQuoteOpen } from 'lib/utils/thorchain/lending/types'
import { useLendingQuoteOpenQuery } from 'pages/Lending/hooks/useLendingQuoteQuery'
import {
  selectAssetById,
  selectAssets,
  selectFeeAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioAccountMetadataByAccountId,
  selectSelectedCurrency,
} from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

import { LoanSummary } from '../LoanSummary'
import { BorrowRoutePaths } from './types'

type BorrowConfirmProps = {
  collateralAssetId: AssetId
  depositAmount: string | null
  setDepositAmount: (amount: string | null) => void
  collateralAccountId: AccountId
  borrowAccountId: AccountId
  borrowAsset: Asset | null
  txId: string | null
  setTxid: (txId: string | null) => void
  confirmedQuote: LendingQuoteOpen | null
  setConfirmedQuote: (quote: LendingQuoteOpen | null) => void
}

export const BorrowConfirm = ({
  collateralAssetId,
  depositAmount,
  collateralAccountId,
  borrowAccountId,
  borrowAsset,
  txId,
  setTxid,
  confirmedQuote,
  setConfirmedQuote,
  setDepositAmount,
}: BorrowConfirmProps) => {
  const {
    state: { wallet },
  } = useWallet()

  const checkLedgerAppOpenIfLedgerConnected = useLedgerOpenApp({ isSigning: true })

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

  const [isLoanPending, setIsLoanPending] = useState(false)
  const [isQuoteExpired, setIsQuoteExpired] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)

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
      depositAmountCryptoPrecision: depositAmount,
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
    depositAmount,
  ])

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

  const selectedCurrency = useAppSelector(selectSelectedCurrency)

  const {
    data: estimatedFeesData,
    isSuccess: isEstimatedFeesDataSuccess,
    isLoading: isEstimatedFeesDataLoading,
    isError: isEstimatedFeesDataError,
  } = useQuoteEstimatedFeesQuery({
    collateralAssetId,
    collateralAccountId,
    depositAmountCryptoPrecision: depositAmount ?? '0',
    confirmedQuote,
  })

  const useLendingQuoteQueryArgs = useMemo(
    () => ({
      // Refetching at confirm step should only be done programmatically with refetch if a quote expires and a user clicks "Refetch Quote"
      enabled: false,
      collateralAssetId,
      collateralAccountId,
      borrowAccountId,
      borrowAssetId: borrowAsset?.assetId ?? '',
      depositAmountCryptoPrecision: depositAmount ?? '0',
    }),
    [borrowAccountId, borrowAsset?.assetId, collateralAccountId, collateralAssetId, depositAmount],
  )

  const { refetch: refetchLendingQuote, isRefetching: isLendingQuoteRefetching } =
    useLendingQuoteOpenQuery(useLendingQuoteQueryArgs)

  const isLendingQuoteSuccess = Boolean(confirmedQuote)

  const collateralAccountFilter = useMemo(
    () => ({ accountId: collateralAccountId }),
    [collateralAccountId],
  )
  const collateralAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, collateralAccountFilter),
  )

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
        depositAmount &&
        wallet &&
        chainAdapter &&
        isLendingQuoteSuccess &&
        isEstimatedFeesDataSuccess &&
        collateralAccountMetadata &&
        borrowAsset &&
        collateralAsset
      )
    )
      return

    setIsLoanPending(true)

    mixpanel?.track(MixPanelEvent.BorrowConfirm, eventData)

    const from = await getThorchainFromAddress({
      accountId: collateralAccountId,
      getPosition: getThorchainLendingPosition,
      assetId: collateralAssetId,
      wallet,
      accountMetadata: collateralAccountMetadata,
    })
    if (!from) throw new Error(`Could not get send address for AccountId ${collateralAccountId}`)
    const supportedEvmChainIds = getSupportedEvmChainIds()
    const { estimatedFees } = estimatedFeesData
    const maybeTxId = await (() => {
      // TODO(gomes): isTokenDeposit. This doesn't exist yet but may in the future.
      const sendInput: SendInput = {
        amountCryptoPrecision: depositAmount ?? '0',
        assetId: collateralAssetId,
        to: confirmedQuote.quoteInboundAddress,
        from,
        sendMax: false,
        accountId: collateralAccountId,
        memo: supportedEvmChainIds.includes(fromAssetId(collateralAssetId).chainId as KnownChainIds)
          ? toHex(confirmedQuote.quoteMemo)
          : confirmedQuote.quoteMemo,
        amountFieldError: '',
        estimatedFees,
        feeType: FeeDataKey.Fast,
        fiatAmount: '',
        fiatSymbol: selectedCurrency,
        vanityAddress: '',
        input: confirmedQuote.quoteInboundAddress,
      }

      if (!sendInput) throw new Error('Error building send input')

      return handleSend({ sendInput, wallet, checkLedgerAppOpenIfLedgerConnected })
    })()

    if (!maybeTxId) {
      throw new Error('Error sending THORCHain lending Txs')
    }

    setTxid(maybeTxId)

    return maybeTxId
  }, [
    confirmedQuote,
    isQuoteExpired,
    loanTxStatus,
    collateralAssetId,
    depositAmount,
    wallet,
    chainAdapter,
    isLendingQuoteSuccess,
    isEstimatedFeesDataSuccess,
    collateralAccountMetadata,
    borrowAsset,
    collateralAsset,
    mixpanel,
    eventData,
    collateralAccountId,
    estimatedFeesData,
    setTxid,
    refetchLendingQuote,
    setConfirmedQuote,
    setDepositAmount,
    history,
    selectedCurrency,
    checkLedgerAppOpenIfLedgerConnected,
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

  if (!depositAmount || !chainAdapter) return null

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
                    <Amount.Crypto value={depositAmount} symbol={collateralAsset?.symbol ?? ''} />
                    <Amount.Fiat
                      color='text.subtle'
                      value={bnOrZero(depositAmount)
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
                    isEstimatedFeesDataSuccess && isLendingQuoteSuccess && !isLendingQuoteRefetching
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
            depositAmountCryptoPrecision={depositAmount ?? '0'}
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
                    isEstimatedFeesDataError ||
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
