import {
  Button,
  CardFooter,
  CardHeader,
  Divider,
  Flex,
  Heading,
  Skeleton,
  Stack,
  useInterval,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { FeeDataEstimate, thorchain } from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation, useMutationState } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { utils } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import type { SendInput } from 'components/Modals/Send/Form'
import { estimateFees, handleSend } from 'components/Modals/Send/utils'
import { AssetToAsset } from 'components/MultiHopTrade/components/TradeConfirm/AssetToAsset'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import { getSupportedEvmChainIds } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { waitForThorchainUpdate } from 'lib/utils/thorchain'
import type { LendingQuoteClose } from 'lib/utils/thorchain/lending/types'
import { useLendingQuoteCloseQuery } from 'pages/Lending/hooks/useLendingCloseQuery'
import { useLendingPositionData } from 'pages/Lending/hooks/useLendingPositionData'
import { useQuoteEstimatedFeesQuery } from 'pages/Lending/hooks/useQuoteEstimatedFees'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectMarketDataById,
  selectSelectedCurrency,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { LoanSummary } from '../LoanSummary'
import { RepayRoutePaths } from './types'

type RepayConfirmProps = {
  collateralAssetId: AssetId
  repaymentAsset: Asset | null
  repaymentPercent: number
  setRepaymentPercent: (percent: number) => void
  collateralAccountId: AccountId
  repaymentAccountId: AccountId
  txId: string | null
  setTxid: (txId: string | null) => void
  confirmedQuote: LendingQuoteClose | null
  setConfirmedQuote: (quote: LendingQuoteClose | null) => void
}

export const RepayConfirm = ({
  collateralAssetId,
  repaymentAsset,
  repaymentPercent,
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

  const { refetch: refetchLendingPositionData } = useLendingPositionData({
    assetId: collateralAssetId,
    accountId: collateralAccountId,
  })

  const { mutateAsync } = useMutation({
    mutationKey: [txId],
    mutationFn: async (_txId: string) => {
      // Enforcing outbound checks when repaying 100% since that will trigger a collateral refund transfer
      // which we *want* to wait for before considering the repay as complete
      await waitForThorchainUpdate({ txId: _txId, skipOutbound: bn(repaymentPercent).lt(100) })
        .promise
      queryClient.invalidateQueries({ queryKey: ['thorchainLendingPosition'], exact: false })
    },
  })

  const lendingMutationStatus = useMutationState({
    filters: { mutationKey: [txId] },
    select: mutation => mutation.state.status,
  })

  const loanTxStatus = useMemo(() => lendingMutationStatus?.[0], [lendingMutationStatus])
  useEffect(() => {
    // don't start polling until we have a tx
    if (!txId) return
    ;(async () => {
      await mutateAsync(txId)
      setIsLoanPending(false)
    })()
  }, [mutateAsync, refetchLendingPositionData, txId])

  const history = useHistory()
  const translate = useTranslate()
  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))

  const handleBack = useCallback(() => {
    history.push(RepayRoutePaths.Input)
  }, [history])

  const divider = useMemo(() => <Divider />, [])

  const { data: lendingPositionData } = useLendingPositionData({
    assetId: collateralAssetId,
    accountId: collateralAccountId,
  })

  const repaymentAmountFiatUserCurrency = useMemo(() => {
    if (!lendingPositionData?.debtBalanceFiatUserCurrency) return null

    const proratedCollateralFiatUserCurrency = bnOrZero(repaymentPercent)
      .times(lendingPositionData.debtBalanceFiatUserCurrency)
      .div(100)

    return proratedCollateralFiatUserCurrency.toFixed()
  }, [lendingPositionData, repaymentPercent])

  const repaymentAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, repaymentAsset?.assetId ?? ''),
  )

  const repaymentAmountCryptoPrecision = useMemo(() => {
    if (!repaymentAmountFiatUserCurrency) return null

    return bnOrZero(repaymentAmountFiatUserCurrency).div(repaymentAssetMarketData.price).toFixed()
  }, [repaymentAmountFiatUserCurrency, repaymentAssetMarketData.price])

  const chainAdapter = getChainAdapterManager().get(
    fromAssetId(repaymentAsset?.assetId ?? '').chainId,
  )
  const selectedCurrency = useAppSelector(selectSelectedCurrency)

  const repaymentAccountNumberFilter = useMemo(
    () => ({ accountId: repaymentAccountId }),
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

  const { refetch: refetchQuote, isRefetching: isLendingQuoteCloseQueryRefetching } =
    useLendingQuoteCloseQuery(useLendingQuoteCloseQueryArgs)

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
        confirmedQuote &&
        repaymentAmountCryptoPrecision &&
        repaymentAccountNumber !== undefined
      )
    )
      return

    setIsLoanPending(true)

    const supportedEvmChainIds = getSupportedEvmChainIds()

    const estimatedFees = await estimateFees({
      cryptoAmount: repaymentAmountCryptoPrecision,
      assetId: repaymentAsset.assetId,
      memo: supportedEvmChainIds.includes(fromAssetId(repaymentAsset.assetId).chainId)
        ? utils.hexlify(utils.toUtf8Bytes(confirmedQuote.quoteMemo))
        : confirmedQuote.quoteMemo,
      to: confirmedQuote.quoteInboundAddress,
      sendMax: false,
      accountId: repaymentAccountId,
      contractAddress: undefined,
    })

    const maybeTxId = await (() => {
      if (repaymentAsset.assetId === thorchainAssetId) {
        return (async () => {
          const { account } = fromAccountId(repaymentAccountId)

          const adapter = chainAdapter as unknown as thorchain.ChainAdapter

          // repayment using THOR is a MsgDeposit tx
          const { txToSign } = await adapter.buildDepositTransaction({
            from: account,
            accountNumber: repaymentAccountNumber,
            value: bnOrZero(repaymentAmountCryptoPrecision)
              .times(bn(10).pow(repaymentAsset.precision))
              .toFixed(0),
            memo: confirmedQuote.quoteMemo,
            chainSpecific: {
              gas: (estimatedFees as FeeDataEstimate<KnownChainIds.ThorchainMainnet>).fast
                .chainSpecific.gasLimit,
              fee: (estimatedFees as FeeDataEstimate<KnownChainIds.ThorchainMainnet>).fast.txFee,
            },
          })
          const signedTx = await adapter.signTransaction({
            txToSign,
            wallet,
          })
          return adapter.broadcastTransaction({
            senderAddress: account,
            receiverAddress: confirmedQuote.quoteInboundAddress,
            hex: signedTx,
          })
        })()
      }

      // TODO(gomes): isTokenDeposit. This doesn't exist yet but may in the future.
      const sendInput: SendInput = {
        cryptoAmount: repaymentAmountCryptoPrecision,
        assetId: repaymentAsset.assetId,
        from: '',
        to: confirmedQuote.quoteInboundAddress,
        sendMax: false,
        accountId: repaymentAccountId,
        memo: supportedEvmChainIds.includes(fromAssetId(repaymentAsset?.assetId).chainId)
          ? utils.hexlify(utils.toUtf8Bytes(confirmedQuote.quoteMemo))
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

      return handleSend({ sendInput, wallet })
    })()

    if (!maybeTxId) {
      throw new Error('Error sending THORCHain lending Txs')
    }

    setTxid(maybeTxId)

    return maybeTxId
  }, [
    chainAdapter,
    confirmedQuote,
    history,
    isQuoteExpired,
    loanTxStatus,
    refetchQuote,
    repaymentAccountId,
    repaymentAccountNumber,
    repaymentAmountCryptoPrecision,
    repaymentAsset,
    selectedCurrency,
    setConfirmedQuote,
    setRepaymentPercent,
    setTxid,
    wallet,
  ])

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

  const swapStatus = useMemo(() => {
    if (loanTxStatus === 'success') return TxStatus.Confirmed
    if (loanTxStatus === 'pending') return TxStatus.Pending
    return TxStatus.Unknown
  }, [loanTxStatus])

  useInterval(() => {
    // This should never happen but it may
    if (!confirmedQuote) return

    // Since we run this interval check every second, subtract a few seconds to avoid
    // off-by-one on the last second as well as the main thread being overloaded and running slow
    const quoteExpiryUnix = dayjs.unix(confirmedQuote.quoteExpiry).subtract(5, 'second').unix()

    const isExpired = dayjs.unix(quoteExpiryUnix).isBefore(dayjs())
    setIsQuoteExpired(isExpired)
  }, 1000)

  const confirmTranslation = useMemo(() => {
    if (isQuoteExpired) return 'lending.refetchQuote'

    return loanTxStatus === 'success' ? 'lending.repayAgain' : 'lending.confirmAndRepay'
  }, [isQuoteExpired, loanTxStatus])

  if (!collateralAsset || !repaymentAsset) return null

  return (
    <SlideTransition>
      <Flex flexDir='column' width='full'>
        <CardHeader>
          <WithBackButton handleBack={handleBack}>
            <Heading as='h5' textAlign='center'>
              <Text translation='Confirm' />
            </Heading>
          </WithBackButton>
        </CardHeader>
        <Stack spacing={0} divider={divider}>
          <AssetToAsset
            buyIcon={collateralAsset?.icon ?? ''}
            sellIcon={repaymentAsset?.icon ?? ''}
            buyColor={collateralAsset?.color ?? ''}
            sellColor={repaymentAsset?.color ?? ''}
            status={swapStatus}
            px={6}
            mb={4}
          />
          <Stack py={4} spacing={4} px={6} fontSize='sm' fontWeight='medium'>
            <RawText fontWeight='bold'>{translate('lending.transactionInfo')}</RawText>
            <Row>
              <Row.Label>{translate('common.send')}</Row.Label>
              <Row.Value textAlign='right'>
                <Skeleton isLoaded={Boolean(confirmedQuote)}>
                  <Stack spacing={1} flexDir='row' flexWrap='wrap'>
                    <Amount.Crypto
                      value={repaymentAmountCryptoPrecision ?? '0'}
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
              <HelperTooltip label={translate('lending.repayNoticeTitle')}>
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
                <Skeleton isLoaded={isEstimatedFeesDataSuccess}>
                  {/* Actually defined at display time, see isLoaded above */}
                  <Amount.Fiat value={estimatedFeesData?.txFeeFiat ?? '0'} />
                </Skeleton>
              </Row.Value>
            </Row>
          </Stack>
          <LoanSummary
            confirmedQuote={confirmedQuote}
            repaymentAsset={repaymentAsset}
            collateralAssetId={collateralAssetId}
            repaymentPercent={repaymentPercent ?? 0}
            repayAmountCryptoPrecision={repaymentAmountCryptoPrecision ?? '0'}
            collateralDecreaseAmountCryptoPrecision={
              confirmedQuote?.quoteLoanCollateralDecreaseCryptoPrecision ?? '0'
            }
            repaymentAccountId={repaymentAccountId}
            collateralAccountId={collateralAccountId}
            debtRepaidAmountUserCurrency={confirmedQuote?.quoteDebtRepaidAmountUserCurrency ?? '0'}
            borderTopWidth={0}
            mt={0}
          />
          <CardFooter px={4} py={4}>
            <Button
              isLoading={
                isEstimatedFeesDataLoading ||
                isLendingQuoteCloseQueryRefetching ||
                loanTxStatus === 'pending' ||
                isLoanPending
              }
              disabled={
                loanTxStatus === 'pending' ||
                isLoanPending ||
                isLendingQuoteCloseQueryRefetching ||
                isEstimatedFeesDataLoading ||
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
          </CardFooter>
        </Stack>
      </Flex>
    </SlideTransition>
  )
}
