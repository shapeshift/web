import { Button, CardFooter, CardHeader, Divider, Flex, Heading, Stack } from '@chakra-ui/react'
import { btcAssetId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { usdcAssetId } from 'test/mocks/accounts'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { AssetToAsset } from 'components/MultiHopTrade/components/TradeConfirm/AssetToAsset'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { LoanSummary } from '../LoanSummary'
import { RepayRoutePaths } from './types'

export const RepayConfirm = () => {
  const history = useHistory()
  const translate = useTranslate()
  const collateralAsset = useAppSelector(state => selectAssetById(state, btcAssetId))
  const debtAsset = useAppSelector(state => selectAssetById(state, usdcAssetId))
  const handleBack = useCallback(() => {
    history.push(RepayRoutePaths.Input)
  }, [history])
  const divider = useMemo(() => <Divider />, [])

  if (!collateralAsset || !debtAsset) return null
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
            sellIcon={debtAsset?.icon ?? ''}
            buyColor={collateralAsset?.color ?? ''}
            sellColor={debtAsset?.color ?? ''}
            status={TxStatus.Unknown}
            px={6}
            mb={4}
          />
          <Stack py={4} spacing={4} px={6} fontSize='sm' fontWeight='medium'>
            <RawText fontWeight='bold'>{translate('lending.transactionInfo')}</RawText>
            <Row>
              <Row.Label>{translate('common.send')}</Row.Label>
              <Row.Value textAlign='right'>
                <Stack spacing={1} flexDir='row' flexWrap='wrap'>
                  <Amount.Crypto value='1' symbol={collateralAsset?.symbol ?? ''} />
                  <Amount.Fiat color='text.subtle' value='29850' prefix='≈' />
                </Stack>
              </Row.Value>
            </Row>
            <Row>
              <Row.Label>{translate('common.recieve')}</Row.Label>
              <Row.Value textAlign='right'>
                <Stack spacing={1} flexDir='row' flexWrap='wrap'>
                  <Amount.Crypto value='14820' symbol={debtAsset?.symbol ?? ''} />
                  <Amount.Fiat color='text.subtle' value='14820' prefix='≈' />
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
          <LoanSummary borderTopWidth={0} mt={0} />
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
