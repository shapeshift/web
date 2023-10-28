import { Button, CardFooter, CardHeader, Divider, Flex, Heading, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { btcAssetId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { AssetToAsset } from 'components/MultiHopTrade/components/TradeConfirm/AssetToAsset'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useLendingQuoteQuery } from 'pages/Lending/hooks/useLendingQuoteQuery'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { LoanSummary } from '../LoanSummary'
import { BorrowRoutePaths } from './types'

type BorrowConfirmProps = {
  collateralAssetId: AssetId
  depositAmount: string | null
  onDepositAmountChange: (value: string) => void
}

export const BorrowConfirm = ({ collateralAssetId, depositAmount }: BorrowConfirmProps) => {
  const borrowAssetId = btcAssetId // TODO(gomes): programmatic
  const history = useHistory()
  const translate = useTranslate()
  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))
  const debtAsset = useAppSelector(state => selectAssetById(state, borrowAssetId))
  const collateralAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, collateralAssetId),
  )
  const handleBack = useCallback(() => {
    history.push(BorrowRoutePaths.Input)
  }, [history])
  const divider = useMemo(() => <Divider />, [])

  const { data: lendingQuoteData, isLoading: isLendingQuoteLoading } = useLendingQuoteQuery({
    collateralAssetId,
    borrowAssetId,
    depositAmountCryptoPrecision: depositAmount ?? '0',
  })

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
            buyIcon={debtAsset?.icon ?? ''}
            sellIcon={collateralAsset?.icon ?? ''}
            buyColor={debtAsset?.color ?? ''}
            sellColor={collateralAsset?.color ?? ''}
            status={TxStatus.Unknown}
            px={6}
            mb={4}
          />
          <Stack py={4} spacing={4} px={6} fontSize='sm' fontWeight='medium'>
            <RawText fontWeight='bold'>{translate('lending.transactionInfo')}</RawText>
            <Row>
              <Row.Label>Send</Row.Label>
              <Row.Value textAlign='right'>
                <Stack spacing={1} flexDir='row' flexWrap='wrap'>
                  <Amount.Crypto value='1' symbol={collateralAsset?.symbol ?? ''} />
                  <Amount.Fiat
                    color='text.subtle'
                    value={bnOrZero(depositAmount)
                      .times(collateralAssetMarketData?.price ?? '0')
                      .toString()}
                    prefix='≈'
                  />
                </Stack>
              </Row.Value>
            </Row>
            <Row>
              <Row.Label>{translate('common.receive')}</Row.Label>
              <Row.Value textAlign='right'>
                <Stack spacing={1} flexDir='row' flexWrap='wrap'>
                  <Amount.Crypto
                    value={lendingQuoteData?.quoteBorrowedAmountCryptoPrecision ?? '0'}
                    symbol={debtAsset?.symbol ?? ''}
                  />
                  <Amount.Fiat
                    color='text.subtle'
                    value={lendingQuoteData?.quoteBorrowedAmountUserCurrency ?? '0'}
                    prefix='≈'
                  />
                </Stack>
              </Row.Value>
            </Row>
            <Row fontSize='sm' fontWeight='medium'>
              <HelperTooltip label='tbd'>
                <Row.Label>{translate('common.feesPlusSlippage')}</Row.Label>
              </HelperTooltip>
              <Row.Value>
                <Amount.Fiat value='10' />
              </Row.Value>
            </Row>
            <Row fontSize='sm' fontWeight='medium'>
              <Row.Label>{translate('common.gasFee')}</Row.Label>
              <Row.Value>
                <Amount.Fiat value='10' />
              </Row.Value>
            </Row>
          </Stack>
          <LoanSummary
            borderTopWidth={0}
            mt={0}
            collateralAssetId={collateralAssetId}
            borrowAssetId={borrowAssetId}
            depositAmountCryptoPrecision={depositAmount ?? '0'}
          />
          <CardFooter px={4} py={4}>
            <Button colorScheme='blue' size='lg' width='full'>
              {translate('lending.confirmAndBorrow')}
            </Button>
          </CardFooter>
        </Stack>
      </Flex>
    </SlideTransition>
  )
}
