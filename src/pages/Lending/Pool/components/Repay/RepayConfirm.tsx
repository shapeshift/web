import {
  Button,
  CardFooter,
  CardHeader,
  Divider,
  Flex,
  Heading,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { FeeDataEstimate, thorchain } from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation, useMutationState } from '@tanstack/react-query'
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
  collateralAccountId: AccountId
  repaymentAccountId: AccountId
  txId: string | null
  setTxid: (txId: string | null) => void
}

export const RepayConfirm = ({
  collateralAssetId,
  repaymentAsset,
  repaymentPercent,
  collateralAccountId,
  repaymentAccountId,
  txId,
  setTxid,
}: RepayConfirmProps) => {
  const {
    state: { wallet },
  } = useWallet()

  const [isLoanPending, setIsLoanPending] = useState(false)

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

  const useLendingQuoteCloseQueryArgs = useMemo(
    () => ({
      collateralAssetId,
      repaymentAssetId: repaymentAsset?.assetId ?? '',
      repaymentPercent,
      repaymentAccountId,
      collateralAccountId,
      isLoanClosePending: loanTxStatus === 'pending',
    }),
    [
      collateralAssetId,
      repaymentAsset?.assetId,
      repaymentPercent,
      repaymentAccountId,
      collateralAccountId,
      loanTxStatus,
    ],
  )

  const {
    data: lendingQuoteCloseData,
    isLoading: isLendingQuoteCloseLoading,
    isSuccess: isLendingQuoteCloseSuccess,
  } = useLendingQuoteCloseQuery(useLendingQuoteCloseQueryArgs)

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
  const handleConfirm = useCallback(async () => {
    if (loanTxStatus === 'pending' || loanTxStatus === 'success') {
      // Reset values when going back to input step
      setTxid(null)
      return history.push(RepayRoutePaths.Input)
    }

    if (
      !(
        repaymentAsset &&
        wallet &&
        chainAdapter &&
        lendingQuoteCloseData &&
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
        ? utils.hexlify(utils.toUtf8Bytes(lendingQuoteCloseData.quoteMemo))
        : lendingQuoteCloseData.quoteMemo,
      to: lendingQuoteCloseData.quoteInboundAddress,
      sendMax: false,
      accountId: repaymentAccountId,
      contractAddress: undefined,
    })

    if (repaymentAsset.assetId === thorchainAssetId) {
      const { account } = fromAccountId(repaymentAccountId)

      const adapter = chainAdapter as unknown as thorchain.ChainAdapter

      // repayment using THOR is a MsgDeposit tx
      const { txToSign } = await adapter.buildDepositTransaction({
        from: account,
        accountNumber: repaymentAccountNumber,
        value: bnOrZero(repaymentAmountCryptoPrecision)
          .times(bn(10).pow(repaymentAsset.precision))
          .toFixed(0),
        memo: lendingQuoteCloseData.quoteMemo,
        chainSpecific: {
          gas: (estimatedFees as FeeDataEstimate<KnownChainIds.ThorchainMainnet>).fast.chainSpecific
            .gasLimit,
          fee: (estimatedFees as FeeDataEstimate<KnownChainIds.ThorchainMainnet>).fast.txFee,
        },
      })
      const signedTx = await adapter.signTransaction({
        txToSign,
        wallet,
      })
      return adapter.broadcastTransaction({
        senderAddress: account,
        receiverAddress: lendingQuoteCloseData.quoteInboundAddress,
        hex: signedTx,
      })
    }

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
            memo: lendingQuoteCloseData.quoteMemo,
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
            receiverAddress: lendingQuoteCloseData.quoteInboundAddress,
            hex: signedTx,
          })
        })()
      }

      // TODO(gomes): isTokenDeposit. This doesn't exist yet but may in the future.
      const sendInput: SendInput = {
        cryptoAmount: repaymentAmountCryptoPrecision,
        assetId: repaymentAsset.assetId,
        from: '',
        to: lendingQuoteCloseData.quoteInboundAddress,
        sendMax: false,
        accountId: repaymentAccountId,
        memo: supportedEvmChainIds.includes(fromAssetId(repaymentAsset?.assetId).chainId)
          ? utils.hexlify(utils.toUtf8Bytes(lendingQuoteCloseData.quoteMemo))
          : lendingQuoteCloseData.quoteMemo,
        amountFieldError: '',
        estimatedFees,
        feeType: FeeDataKey.Fast,
        fiatAmount: '',
        fiatSymbol: selectedCurrency,
        vanityAddress: '',
        input: lendingQuoteCloseData.quoteInboundAddress,
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
    history,
    lendingQuoteCloseData,
    loanTxStatus,
    repaymentAccountId,
    repaymentAccountNumber,
    repaymentAmountCryptoPrecision,
    repaymentAsset,
    selectedCurrency,
    setTxid,
    wallet,
  ])

  const {
    data: estimatedFeesData,
    isLoading: isEstimatedFeesDataLoading,
    isSuccess: isEstimatedFeesDataSuccess,
  } = useQuoteEstimatedFeesQuery({
    collateralAssetId,
    collateralAccountId,
    repaymentAccountId,
    repaymentPercent,
    repaymentAsset,
  })

  const swapStatus = useMemo(() => {
    if (loanTxStatus === 'success') return TxStatus.Confirmed
    if (loanTxStatus === 'pending') return TxStatus.Pending
    return TxStatus.Unknown
  }, [loanTxStatus])

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
                <Skeleton isLoaded={isLendingQuoteCloseSuccess}>
                  <Stack spacing={1} flexDir='row' flexWrap='wrap'>
                    <Amount.Crypto
                      value={repaymentAmountCryptoPrecision ?? '0'}
                      symbol={repaymentAsset?.symbol ?? ''}
                    />
                    <Amount.Fiat
                      color='text.subtle'
                      // Actually defined at display time, see isLoaded above
                      value={lendingQuoteCloseData?.quoteDebtRepaidAmountUsd ?? '0'}
                      prefix='≈'
                    />
                  </Stack>
                </Skeleton>
              </Row.Value>
            </Row>
            <Skeleton isLoaded={isLendingQuoteCloseSuccess}>
              <Row>
                <HelperTooltip label={translate('lending.repayNoticeTitle')}>
                  <Row.Label>{translate('common.receive')}</Row.Label>
                </HelperTooltip>
                <Row.Value textAlign='right'>
                  <Stack spacing={1} flexDir='row' flexWrap='wrap'>
                    <Amount.Crypto
                      // Actually defined at display time, see isLoaded above
                      value={
                        lendingQuoteCloseData?.quoteLoanCollateralDecreaseCryptoPrecision ?? '0'
                      }
                      symbol={collateralAsset?.symbol ?? ''}
                    />
                    <Amount.Fiat
                      color='text.subtle'
                      // Actually defined at display time, see isLoaded above
                      value={
                        lendingQuoteCloseData?.quoteLoanCollateralDecreaseFiatUserCurrency ?? '0'
                      }
                      prefix='≈'
                    />
                  </Stack>
                </Row.Value>
              </Row>
            </Skeleton>
            <Skeleton isLoaded={isLendingQuoteCloseSuccess}>
              <Row fontSize='sm' fontWeight='medium'>
                <HelperTooltip label={translate('lending.feesNotice')}>
                  <Row.Label>{translate('common.feesPlusSlippage')}</Row.Label>
                </HelperTooltip>
                <Row.Value>
                  <Amount.Fiat
                    // Actually defined at display time, see isLoaded above
                    value={lendingQuoteCloseData?.quoteTotalFeesFiatUserCurrency ?? '0'}
                  />
                </Row.Value>
              </Row>
            </Skeleton>
            <Row fontSize='sm' fontWeight='medium'>
              <Row.Label>{translate('common.gasFee')}</Row.Label>
              <Row.Value>
                <Skeleton isLoaded={isEstimatedFeesDataSuccess && isLendingQuoteCloseSuccess}>
                  {/* Actually defined at display time, see isLoaded above */}
                  <Amount.Fiat value={estimatedFeesData?.txFeeFiat ?? '0'} />
                </Skeleton>
              </Row.Value>
            </Row>
          </Stack>
          <LoanSummary
            repaymentAsset={repaymentAsset}
            collateralAssetId={collateralAssetId}
            repaymentPercent={repaymentPercent ?? 0}
            repayAmountCryptoPrecision={repaymentAmountCryptoPrecision ?? '0'}
            collateralDecreaseAmountCryptoPrecision={
              lendingQuoteCloseData?.quoteLoanCollateralDecreaseCryptoPrecision ?? '0'
            }
            repaymentAccountId={repaymentAccountId}
            collateralAccountId={collateralAccountId}
            debtRepaidAmountUserCurrency={lendingQuoteCloseData?.quoteDebtRepaidAmountUsd ?? '0'}
            borderTopWidth={0}
            mt={0}
          />
          <CardFooter px={4} py={4}>
            <Button
              isLoading={
                isLendingQuoteCloseLoading ||
                isEstimatedFeesDataLoading ||
                loanTxStatus === 'pending' ||
                isLoanPending
              }
              disabled={loanTxStatus === 'pending'}
              onClick={handleConfirm}
              colorScheme='blue'
              size='lg'
              width='full'
            >
              {translate(
                loanTxStatus === 'success' ? 'lending.repayAgain' : 'lending.confirmAndRepay',
              )}
            </Button>
          </CardFooter>
        </Stack>
      </Flex>
    </SlideTransition>
  )
}
