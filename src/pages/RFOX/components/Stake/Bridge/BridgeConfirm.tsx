import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  IconButton,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { type FC, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { FormDivider } from 'components/FormDivider'
import { getChainShortName } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/utils/getChainShortName'
import { Row, type RowProps } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Timeline, TimelineItem } from 'components/Timeline/Timeline'
import { useLedgerOpenApp } from 'hooks/useLedgerOpenApp/useLedgerOpenApp'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { selectPortfolioCryptoPrecisionBalanceByFilter } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StakeRoutePaths } from '../types'
import { useRfoxBridge } from './hooks/useRfoxBridge'
import { useRfoxBridgeApproval } from './hooks/useRfoxBridgeApproval'
import type { RfoxBridgeQuote } from './types'
import { BridgeRoutePaths, type BridgeRouteProps } from './types'

type BridgeConfirmProps = {
  confirmedQuote: RfoxBridgeQuote
}

const backIcon = <ArrowBackIcon />

const CustomRow: React.FC<RowProps> = props => <Row fontSize='sm' fontWeight='medium' {...props} />

export const BridgeConfirm: FC<BridgeRouteProps & BridgeConfirmProps> = ({ confirmedQuote }) => {
  const history = useHistory()
  const translate = useTranslate()
  const checkLedgerAppOpenIfLedgerConnected = useLedgerOpenApp({ isSigning: true })

  const {
    sellAsset,
    buyAsset,
    feeAsset,
    networkFeeUserCurrency,
    tradeQuoteQuery: { data: quote, isLoading: isQuoteLoading },
    bridgeAmountCryptoPrecision,
    bridgeAmountUserCurrency,
  } = useRfoxBridge({ confirmedQuote })

  const {
    isApprovalRequired,
    allowanceQuery: { isLoading: isAllowanceDataLoading },
    isGetApprovalFeesEnabled,
    approvalFeesQuery: { data: approvalFees, isLoading: isGetApprovalFeesLoading },
    isApprovalTxPending,
    isTransitioning,
    handleApprove,
  } = useRfoxBridgeApproval({
    confirmedQuote,
  })

  const feeAssetBalanceFilter = useMemo(
    () => ({
      accountId: confirmedQuote.sellAssetAccountId,
      assetId: feeAsset?.assetId,
    }),
    [confirmedQuote.sellAssetAccountId, feeAsset?.assetId],
  )
  const feeAssetBalanceCryptoPrecision = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, feeAssetBalanceFilter),
  )

  const hasEnoughFeeBalance = useMemo(() => {
    // Fees loading, we don't know what we don't know
    if (isQuoteLoading || isGetApprovalFeesLoading) return true
    if (bnOrZero(feeAssetBalanceCryptoPrecision).isZero()) return false

    const fees = (() => {
      if (approvalFees) return approvalFees
      if (quote?.isOk()) return quote?.unwrap().steps[0].feeData
    })()

    const hasEnoughFeeBalance = bnOrZero(fees?.networkFeeCryptoBaseUnit).lte(
      toBaseUnit(feeAssetBalanceCryptoPrecision, feeAsset?.precision ?? 0),
    )

    if (!hasEnoughFeeBalance) return false

    return true
  }, [
    isQuoteLoading,
    isGetApprovalFeesLoading,
    feeAssetBalanceCryptoPrecision,
    feeAsset?.precision,
    approvalFees,
    quote,
  ])

  const handleGoBack = useCallback(() => {
    history.push(StakeRoutePaths.Input)
  }, [history])

  const handleSubmit = useCallback(() => {
    if (!feeAsset) return

    if (isApprovalRequired) {
      return checkLedgerAppOpenIfLedgerConnected(feeAsset.chainId)
        .then(() => {
          handleApprove()
        })
        .catch(console.error)
    }

    history.push({ pathname: BridgeRoutePaths.Status, state: confirmedQuote })
  }, [
    confirmedQuote,
    history,
    feeAsset,
    checkLedgerAppOpenIfLedgerConnected,
    handleApprove,
    isApprovalRequired,
  ])

  const bridgeCard = useMemo(() => {
    if (!(sellAsset && buyAsset)) return null
    return (
      <>
        <Card
          display='flex'
          alignItems='stretch'
          justifyContent='space-evenly'
          flexDir='row'
          gap={4}
          py={6}
          px={4}
        >
          <Stack alignItems='center'>
            <AssetIcon size='sm' assetId={sellAsset?.assetId} />
            <Stack textAlign='center' spacing={0}>
              <Amount.Crypto value={bridgeAmountCryptoPrecision} symbol={sellAsset.symbol} />
              <Amount.Fiat fontSize='sm' color='text.subtle' value={bridgeAmountUserCurrency} />
            </Stack>
          </Stack>
          <FormDivider my={-6} orientation='vertical' />
          <Stack alignItems='center'>
            <AssetIcon size='sm' assetId={buyAsset?.assetId} />
            <Stack textAlign='center' spacing={0}>
              <Amount.Crypto value={bridgeAmountCryptoPrecision} symbol={buyAsset.symbol} />
              <Amount.Fiat fontSize='sm' color='text.subtle' value={bridgeAmountUserCurrency} />
            </Stack>
          </Stack>
        </Card>
      </>
    )
  }, [sellAsset, buyAsset, bridgeAmountCryptoPrecision, bridgeAmountUserCurrency])

  const errorCopy = useMemo(() => {
    if (!hasEnoughFeeBalance)
      return translate('common.insufficientAmountForGas', {
        assetSymbol: feeAsset?.symbol,
        chainSymbol: getChainShortName(feeAsset?.chainId as KnownChainIds),
      })
  }, [feeAsset?.chainId, feeAsset?.symbol, hasEnoughFeeBalance, translate])

  const submitCopy = useMemo(() => {
    if (errorCopy) return errorCopy

    return translate(isApprovalRequired ? 'common.approve' : 'RFOX.bridgeAndConfirm')
  }, [errorCopy, isApprovalRequired, translate])

  return (
    <SlideTransition>
      <CardHeader display='flex' alignItems='center' gap={2}>
        <Flex flex={1}>
          <IconButton onClick={handleGoBack} variant='ghost' aria-label='back' icon={backIcon} />
        </Flex>
        <Flex textAlign='center'>{translate('common.confirm')}</Flex>
        <Flex flex={1} />
      </CardHeader>
      <CardBody>
        <Stack spacing={6}>
          {bridgeCard}
          <Timeline>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{sellAsset?.name ?? ''}</Row.Label>
                <Row.Value>
                  <Amount.Crypto
                    symbol={sellAsset?.symbol ?? ''}
                    value={bridgeAmountCryptoPrecision}
                  />
                </Row.Value>
              </CustomRow>
            </TimelineItem>
            {isGetApprovalFeesEnabled && (
              <TimelineItem>
                <CustomRow>
                  <Row.Label>{translate('common.approvalFee')}</Row.Label>
                  <Skeleton isLoaded={Boolean(!isGetApprovalFeesLoading && approvalFees)}>
                    <Row.Value>
                      <Amount.Fiat value={approvalFees?.txFeeFiat ?? '0'} />
                    </Row.Value>
                  </Skeleton>
                </CustomRow>
              </TimelineItem>
            )}
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.networkFee')}</Row.Label>
                <Row.Value>
                  <Skeleton isLoaded={!!networkFeeUserCurrency}>
                    <Row.Value>
                      <Amount.Fiat value={networkFeeUserCurrency ?? '0'} />
                    </Row.Value>
                  </Skeleton>
                </Row.Value>
              </CustomRow>
            </TimelineItem>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{buyAsset?.name ?? ''}</Row.Label>
                <Row.Value>
                  <Amount.Crypto
                    symbol={buyAsset?.symbol ?? ''}
                    value={bridgeAmountCryptoPrecision}
                  />
                </Row.Value>
              </CustomRow>
            </TimelineItem>
          </Timeline>
        </Stack>
      </CardBody>

      <CardFooter
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={4}
        px={6}
        bg='background.surface.raised.accent'
        borderBottomRadius='xl'
      >
        <Button
          size='lg-multiline'
          mx={-2}
          colorScheme={errorCopy ? 'red' : 'blue'}
          isLoading={
            isAllowanceDataLoading ||
            isGetApprovalFeesLoading ||
            isApprovalTxPending ||
            isTransitioning ||
            isQuoteLoading
          }
          isDisabled={!hasEnoughFeeBalance || isAllowanceDataLoading || isQuoteLoading}
          onClick={handleSubmit}
        >
          {submitCopy}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
