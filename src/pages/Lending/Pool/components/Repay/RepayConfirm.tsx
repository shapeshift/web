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
  useInterval,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { assertAndProcessMemo } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation, useMutationState, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import prettyMilliseconds from 'pretty-ms'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { selectInboundAddressData } from 'react-queries/selectors'
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
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { getMaybeCompositeAssetSymbol } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { isToken } from 'lib/utils'
import { waitForThorchainUpdate } from 'lib/utils/thorchain'
import { useSendThorTx } from 'lib/utils/thorchain/hooks/useSendThorTx'
import type { LendingQuoteClose } from 'lib/utils/thorchain/lending/types'
import { useLendingQuoteCloseQuery } from 'pages/Lending/hooks/useLendingCloseQuery'
import { useLendingPositionData } from 'pages/Lending/hooks/useLendingPositionData'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectAssets,
  selectFeeAssetById,
} from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

import { LoanSummary } from '../LoanSummary'
import { RepayRoutePaths } from './types'

type RepayConfirmProps = {
  collateralAssetId: AssetId
  repaymentAsset: Asset | null
  setRepaymentPercent: (percent: number) => void
  collateralAccountId: AccountId | null
  repaymentAccountId: AccountId | null
  txId: string | null
  setTxid: (txId: string | null) => void
  confirmedQuote: LendingQuoteClose | null
  setConfirmedQuote: (quote: LendingQuoteClose | null) => void
}

export const RepayConfirm = ({
  collateralAssetId,
  repaymentAsset,
  setRepaymentPercent,
  collateralAccountId,
  repaymentAccountId,
  txId,
  setTxid,
  confirmedQuote,
  setConfirmedQuote,
}: RepayConfirmProps) => {
  const {
    state: { wallet },
  } = useWallet()

  const [isLoanPending, setIsLoanPending] = useState(false)
  const [isQuoteExpired, setIsQuoteExpired] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)

  const { refetch: refetchLendingPositionData } = useLendingPositionData({
    assetId: collateralAssetId,
    accountId: collateralAccountId,
  })

  const { mutateAsync } = useMutation({
    mutationKey: [txId],
    mutationFn: async ({
      txId: _txId,
      expectedCompletionTime,
    }: {
      txId: string
      expectedCompletionTime?: number
    }) => {
      if (!confirmedQuote) throw new Error('Cannot fetch THOR Tx status withut a confirmed quote')

      // Enforcing outbound checks when repaying 100% since that will trigger a collateral refund transfer
      // which we *want* to wait for before considering the repay as complete
      await waitForThorchainUpdate({
        txId: _txId,
        skipOutbound: bn(confirmedQuote.repaymentPercent).lt(100),
        expectedCompletionTime,
      }).promise
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

  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))
  const repaymentFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, repaymentAsset?.assetId ?? ''),
  )
  const collateralFeeAsset = useAppSelector(state => selectFeeAssetById(state, collateralAssetId))

  const eventData = useMemo(() => {
    if (!confirmedQuote) return {}

    const assets = selectAssets(store.getState())

    const compositeRepaymentAsset = getMaybeCompositeAssetSymbol(
      repaymentAsset?.assetId ?? '',
      assets,
    )
    const compositeCollateralAsset = getMaybeCompositeAssetSymbol(
      collateralAsset?.assetId ?? '',
      assets,
    )

    return {
      repaymentAsset: compositeRepaymentAsset,
      collateralAsset: compositeCollateralAsset,
      repaymentAssetChain: repaymentFeeAsset?.networkName,
      collateralAssetChain: collateralFeeAsset?.networkName,
      totalFeesUserCurrency: bn(confirmedQuote.quoteTotalFeesFiatUserCurrency).toFixed(2),
      totalFeesUsd: bn(confirmedQuote.quoteTotalFeesFiatUsd).toFixed(2),
      repaymentPercent: confirmedQuote.repaymentPercent,
      repaymentAmountUserCurrency: bnOrZero(confirmedQuote.repaymentAmountFiatUserCurrency).toFixed(
        2,
      ),
      repaymentAmountUsd: bnOrZero(confirmedQuote.repaymentAmountFiatUsd).toFixed(2),
      repaymentAmountCryptoPrecision: confirmedQuote.repaymentAmountCryptoPrecision,
      debtRepaidAmountUserCurrency: bn(confirmedQuote.quoteDebtRepaidAmountUserCurrency).toFixed(2),
      debtRepaidAmountUsd: bn(confirmedQuote.quoteDebtRepaidAmountUsd).toFixed(2),
      collateralDecreaseCryptoPrecision: confirmedQuote.quoteLoanCollateralDecreaseCryptoPrecision,
      collateralDecreaseUserCurrency: bn(
        confirmedQuote.quoteLoanCollateralDecreaseFiatUserCurrency,
      ).toFixed(2),
      collateralDecreaseUsd: bn(confirmedQuote.quoteLoanCollateralDecreaseFiatUsd).toFixed(2),
    }
  }, [
    collateralAsset?.assetId,
    collateralFeeAsset?.networkName,
    confirmedQuote,
    repaymentAsset?.assetId,
    repaymentFeeAsset?.networkName,
  ])

  const mixpanel = getMixPanel()

  const loanTxStatus = useMemo(() => lendingMutationStatus?.[0], [lendingMutationStatus])

  useEffect(() => {
    // don't start polling until we have a tx
    if (!(txId && confirmedQuote)) return
    ;(async () => {
      const expectedCompletionTime = dayjs()
        .add(confirmedQuote.quoteTotalTimeMs, 'millisecond')
        .unix()
      await mutateAsync({ txId, expectedCompletionTime })
      mixpanel?.track(MixPanelEvent.RepaySuccess, eventData)
      setIsLoanPending(false)
    })()
  }, [confirmedQuote, eventData, mixpanel, mutateAsync, refetchLendingPositionData, txId])

  const history = useHistory()
  const translate = useTranslate()

  const handleBack = useCallback(() => {
    history.push(RepayRoutePaths.Input)
  }, [history])

  const divider = useMemo(() => <Divider />, [])

  const chainAdapter = getChainAdapterManager().get(
    fromAssetId(repaymentAsset?.assetId ?? '').chainId,
  )
  const repaymentAccountNumberFilter = useMemo(
    () => ({ accountId: repaymentAccountId ?? '' }),
    [repaymentAccountId],
  )
  const repaymentAccountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, repaymentAccountNumberFilter),
  )

  const useLendingQuoteCloseQueryArgs = useMemo(
    () => ({
      // Refetching at confirm step should only be done programmatically with refetch if a quote expires and a user clicks "Refetch Quote"
      enabled: false,
      collateralAssetId,
      collateralAccountId,
      repaymentAssetId: repaymentAsset?.assetId ?? '',
      repaymentAccountId,
      // Use the previously locked quote's repayment perecent to refetch a quote after expiry
      // This is locked in the confirmed quote and should never be programmatic, or we risk being off-by-one and missing a bit of dust for 100% repayments
      repaymentPercent: confirmedQuote?.repaymentPercent ?? 0,
    }),
    [
      collateralAccountId,
      collateralAssetId,
      repaymentAccountId,
      repaymentAsset?.assetId,
      confirmedQuote?.repaymentPercent,
    ],
  )

  const { refetch: refetchQuote, isRefetching: isLendingQuoteCloseQueryRefetching } =
    useLendingQuoteCloseQuery(useLendingQuoteCloseQueryArgs)

  const { data: inboundAddressData, isLoading: isInboundAddressLoading } = useQuery({
    ...reactQueries.thornode.inboundAddresses(),
    staleTime: 60_000,
    select: data => selectInboundAddressData(data, repaymentAsset?.assetId),
    enabled: !!repaymentAsset?.assetId,
  })

  const memo = useMemo(() => {
    if (!confirmedQuote) return null

    return assertAndProcessMemo(confirmedQuote.quoteMemo)
  }, [confirmedQuote])

  const {
    executeTransaction,
    estimatedFeesData,
    isEstimatedFeesDataLoading,
    isEstimatedFeesDataError,
  } = useSendThorTx({
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
    disableEstimateFeesRefetch: isLoanPending,
  })

  const handleConfirm = useCallback(async () => {
    if (isQuoteExpired) {
      const { data: refetchedQuote } = await refetchQuote()
      setConfirmedQuote(refetchedQuote ?? null)
      return
    }

    if (loanTxStatus === 'pending') return // no-op
    if (loanTxStatus === 'success') {
      // Reset values when going back to input step
      setTxid(null)
      setConfirmedQuote(null)
      setRepaymentPercent(100)
      return history.push(RepayRoutePaths.Input)
    }

    if (
      !(
        repaymentAsset &&
        wallet &&
        chainAdapter &&
        confirmedQuote?.repaymentAmountCryptoPrecision &&
        repaymentAccountNumber !== undefined &&
        (!isToken(fromAssetId(repaymentAsset.assetId).assetReference) ||
          (isToken(fromAssetId(repaymentAsset.assetId).assetReference) && inboundAddressData))
      )
    )
      return

    // This should never happen, but if it does, we don't want to rug our testing accounts and have to wait 30.5 more days before testing again
    if (
      bn(confirmedQuote.repaymentPercent).gte(100) &&
      bn(confirmedQuote.quoteLoanCollateralDecreaseCryptoPrecision).isZero()
    ) {
      throw new Error('100% repayments should trigger a collateral refund transfer')
    }

    setIsLoanPending(true)

    mixpanel?.track(MixPanelEvent.RepayConfirm, eventData)

    const _txId = await executeTransaction()
    if (!_txId) throw new Error('failed to broadcast transaction')

    setTxid(_txId)
  }, [
    chainAdapter,
    confirmedQuote?.quoteLoanCollateralDecreaseCryptoPrecision,
    confirmedQuote?.repaymentAmountCryptoPrecision,
    confirmedQuote?.repaymentPercent,
    eventData,
    history,
    inboundAddressData,
    isQuoteExpired,
    loanTxStatus,
    mixpanel,
    executeTransaction,
    refetchQuote,
    repaymentAccountNumber,
    repaymentAsset,
    setConfirmedQuote,
    setRepaymentPercent,
    setTxid,
    wallet,
  ])

  const swapStatus = useMemo(() => {
    if (loanTxStatus === 'success') return TxStatus.Confirmed
    if (loanTxStatus === 'pending') return TxStatus.Pending
    return TxStatus.Unknown
  }, [loanTxStatus])

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

    return loanTxStatus === 'success' ? 'lending.repayAgain' : 'lending.confirmAndRepay'
  }, [isQuoteExpired, loanTxStatus])

  const maybeLedgerOpenAppWarning = useMemo(() => {
    if (!wallet || !isLedger(wallet)) return null

    const chain = (() => {
      if (!chainAdapter) return ''
      // All EVM chains are managed using the Ethereum app on Ledger
      if (isEvmChainId(fromAssetId(repaymentAsset?.assetId ?? '').chainId)) return 'Ethereum'
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
  }, [chainAdapter, repaymentAsset, wallet])

  if (!collateralAsset || !repaymentAsset) return null

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
              buyIcon={collateralAsset?.icon ?? ''}
              sellIcon={repaymentAsset?.icon ?? ''}
              buyColor={collateralAsset?.color ?? ''}
              sellColor={repaymentAsset?.color ?? ''}
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
                <Skeleton isLoaded={Boolean(confirmedQuote)}>
                  <Stack spacing={1} flexDir='row' flexWrap='wrap'>
                    <Amount.Crypto
                      // Actually defined at display time, see isLoaded above
                      value={confirmedQuote?.repaymentAmountCryptoPrecision ?? '0'}
                      symbol={repaymentAsset?.symbol ?? ''}
                    />
                    <Amount.Fiat
                      color='text.subtle'
                      // Actually defined at display time, see isLoaded above
                      value={confirmedQuote?.quoteDebtRepaidAmountUserCurrency ?? '0'}
                      prefix='≈'
                    />
                  </Stack>
                </Skeleton>
              </Row.Value>
            </Row>
            <Row>
              <HelperTooltip label={translate('lending.receiveCollateral')}>
                <Row.Label>{translate('common.receive')}</Row.Label>
              </HelperTooltip>
              <Row.Value textAlign='right'>
                <Skeleton isLoaded={Boolean(confirmedQuote)}>
                  <Stack spacing={1} flexDir='row' flexWrap='wrap'>
                    <Amount.Crypto
                      // Actually defined at display time, see isLoaded above
                      value={confirmedQuote?.quoteLoanCollateralDecreaseCryptoPrecision ?? '0'}
                      symbol={collateralAsset?.symbol ?? ''}
                    />
                    <Amount.Fiat
                      color='text.subtle'
                      // Actually defined at display time, see isLoaded above
                      value={confirmedQuote?.quoteLoanCollateralDecreaseFiatUserCurrency ?? '0'}
                      prefix='≈'
                    />
                  </Stack>
                </Skeleton>
              </Row.Value>
            </Row>
            <Row fontSize='sm' fontWeight='medium'>
              <HelperTooltip label={translate('lending.feesNotice')}>
                <Row.Label>{translate('common.feesPlusSlippage')}</Row.Label>
              </HelperTooltip>
              <Row.Value>
                <Skeleton isLoaded={Boolean(confirmedQuote)}>
                  <Amount.Fiat
                    // Actually defined at display time, see isLoaded above
                    value={confirmedQuote?.quoteTotalFeesFiatUserCurrency ?? '0'}
                  />
                </Skeleton>
              </Row.Value>
            </Row>
            <Row fontSize='sm' fontWeight='medium'>
              <Row.Label>{translate('common.gasFee')}</Row.Label>
              <Row.Value>
                <Skeleton isLoaded={!isEstimatedFeesDataLoading}>
                  {/* Actually defined at display time, see isLoaded above */}
                  <Amount.Fiat value={estimatedFeesData?.txFeeFiat ?? '0'} />
                </Skeleton>
              </Row.Value>
            </Row>
            <Row fontSize='sm' fontWeight='medium'>
              <Row.Label>{translate('bridge.waitTimeLabel')}</Row.Label>
              <Row.Value>
                <Skeleton isLoaded={Boolean(confirmedQuote)}>
                  <RawText fontWeight='bold'>
                    {prettyMilliseconds(confirmedQuote?.quoteTotalTimeMs ?? 0)}
                  </RawText>
                </Skeleton>
              </Row.Value>
            </Row>
          </Stack>
          <LoanSummary
            confirmedQuote={confirmedQuote}
            repaymentAsset={repaymentAsset}
            collateralAssetId={collateralAssetId}
            repaymentPercent={confirmedQuote?.repaymentPercent ?? 0}
            repayAmountCryptoPrecision={confirmedQuote?.repaymentAmountCryptoPrecision ?? '0'}
            collateralDecreaseAmountCryptoPrecision={
              confirmedQuote?.quoteLoanCollateralDecreaseCryptoPrecision ?? '0'
            }
            repaymentAccountId={repaymentAccountId ?? ''}
            collateralAccountId={collateralAccountId ?? ''}
            debtRepaidAmountUserCurrency={confirmedQuote?.quoteDebtRepaidAmountUserCurrency ?? '0'}
            borderTopWidth={0}
            mt={0}
          />
          <CardFooter px={4} py={4}>
            <Stack spacing={4} width='full'>
              {maybeLedgerOpenAppWarning && <Box width='full'>{maybeLedgerOpenAppWarning}</Box>}
              <Box width='full'>
                <Button
                  isLoading={
                    isEstimatedFeesDataLoading ||
                    isLendingQuoteCloseQueryRefetching ||
                    loanTxStatus === 'pending' ||
                    isLoanPending ||
                    isInboundAddressLoading
                  }
                  disabled={
                    loanTxStatus === 'pending' ||
                    isLoanPending ||
                    isLendingQuoteCloseQueryRefetching ||
                    isEstimatedFeesDataLoading ||
                    isInboundAddressLoading ||
                    isEstimatedFeesDataError ||
                    !confirmedQuote
                  }
                  onClick={handleConfirm}
                  colorScheme='blue'
                  size='lg'
                  width='full'
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
