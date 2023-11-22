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
import { fromAssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
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
import { bnOrZero } from 'lib/bignumber/bignumber'
import { waitForThorchainUpdate } from 'lib/utils/thorchain'
import { useLendingQuoteCloseQuery } from 'pages/Lending/hooks/useLendingCloseQuery'
import { useLendingPositionData } from 'pages/Lending/hooks/useLendingPositionData'
import { useQuoteEstimatedFeesQuery } from 'pages/Lending/hooks/useQuoteEstimatedFees'
import {
  selectAssetById,
  selectMarketDataById,
  selectSelectedCurrency,
  selectUserCurrencyToUsdRate,
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
}

export const RepayConfirm = ({
  collateralAssetId,
  repaymentAsset,
  repaymentPercent,
  collateralAccountId,
  repaymentAccountId,
}: RepayConfirmProps) => {
  const [isLoanClosePending, setIsLoanClosePending] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)

  const {
    state: { wallet },
  } = useWallet()

  const { refetch: refetchLendingPositionData } = useLendingPositionData({
    assetId: collateralAssetId,
    accountId: collateralAccountId,
  })

  useEffect(() => {
    // don't start polling until we have a tx
    if (!txHash) return

    setIsLoanClosePending(true)
    ;(async () => {
      await waitForThorchainUpdate({ txHash, queryClient, skipOutbound: true }).promise
      setIsLoanClosePending(false)
      await refetchLendingPositionData()
    })()
  }, [refetchLendingPositionData, txHash])

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

  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)

  const debtBalanceUserCurrency = useMemo(() => {
    return bnOrZero(lendingPositionData?.debtBalanceFiatUSD ?? 0)
      .times(userCurrencyToUsdRate)
      .toFixed()
  }, [lendingPositionData, userCurrencyToUsdRate])

  const repaymentAmountFiatUserCurrency = useMemo(() => {
    if (!lendingPositionData) return null

    const proratedCollateralFiatUserCurrency = bnOrZero(repaymentPercent)
      .times(debtBalanceUserCurrency)
      .div(100)

    return proratedCollateralFiatUserCurrency.toFixed()
  }, [debtBalanceUserCurrency, lendingPositionData, repaymentPercent])

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
      isLoanClosePending,
    }),
    [
      collateralAccountId,
      collateralAssetId,
      repaymentAccountId,
      repaymentAsset?.assetId,
      repaymentPercent,
      isLoanClosePending,
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

  const handleRepay = useCallback(async () => {
    if (
      !(
        repaymentAsset &&
        wallet &&
        chainAdapter &&
        lendingQuoteCloseData &&
        repaymentAmountCryptoPrecision
      )
    )
      return

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

    const maybeTxId = await (() => {
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

    setTxHash(maybeTxId)

    return maybeTxId
  }, [
    chainAdapter,
    lendingQuoteCloseData,
    repaymentAccountId,
    repaymentAmountCryptoPrecision,
    repaymentAsset,
    selectedCurrency,
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
            status={TxStatus.Unknown}
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
                <Row.Label>{translate('common.receive')}</Row.Label>
                <Row.Value textAlign='right'>
                  <Stack spacing={1} flexDir='row' flexWrap='wrap'>
                    <Amount.Crypto
                      // Actually defined at display time, see isLoaded above
                      value={
                        lendingQuoteCloseData?.quoteLoanCollateralDecreaseCryptoPrecision ?? '0'
                      }
                      symbol={repaymentAsset?.symbol ?? ''}
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
                <HelperTooltip label='tbd'>
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
            debtRepaidAmountUsd={lendingQuoteCloseData?.quoteDebtRepaidAmountUsd ?? '0'}
            borderTopWidth={0}
            mt={0}
          />
          <CardFooter px={4} py={4}>
            <Button
              isLoading={
                isLendingQuoteCloseLoading || isEstimatedFeesDataLoading || isLoanClosePending
              }
              disabled={isLoanClosePending}
              onClick={handleRepay}
              colorScheme='blue'
              size='lg'
              width='full'
            >
              {translate('lending.confirmAndRepay')}
            </Button>
          </CardFooter>
        </Stack>
      </Flex>
    </SlideTransition>
  )
}
