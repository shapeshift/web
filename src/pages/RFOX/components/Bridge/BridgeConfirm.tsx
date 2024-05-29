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
import { type FC, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Row, type RowProps } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Timeline, TimelineItem } from 'components/Timeline/Timeline'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { RfoxBridgeQuote } from './types'
import { BridgeRoutePaths, type BridgeRouteProps } from './types'

type BridgeConfirmProps = {
  bridgeQuote: RfoxBridgeQuote
  setBridgeTxid: (txId: string) => void
}

const backIcon = <ArrowBackIcon />

const CustomRow: React.FC<RowProps> = props => <Row fontSize='sm' fontWeight='medium' {...props} />

export const BridgeConfirm: FC<BridgeRouteProps & BridgeConfirmProps> = ({
  bridgeQuote,
  setBridgeTxid,
}) => {
  const history = useHistory()
  const translate = useTranslate()

  const handleGoBack = useCallback(() => {
    // TODO(gomes): implement me, but this should route back to stake, not bridge as there's no select route here
    // history.push(BridgeRoutePaths.Select)
  }, [])

  const sellAsset = useAppSelector(state => selectAssetById(state, bridgeQuote.sellAssetId))
  const buyAsset = useAppSelector(state => selectAssetById(state, bridgeQuote.buyAssetId))

  const bridgeAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(bridgeQuote.bridgeAmountCryptoBaseUnit, sellAsset?.precision ?? 0),
    [bridgeQuote.bridgeAmountCryptoBaseUnit, sellAsset?.precision],
  )

  const sellAssetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, bridgeQuote.sellAssetId),
  )

  const bridgeAmountUserCurrency = useMemo(
    () =>
      bnOrZero(bridgeAmountCryptoPrecision).times(sellAssetMarketDataUserCurrency.price).toFixed(),
    [bridgeAmountCryptoPrecision, sellAssetMarketDataUserCurrency.price],
  )

  const bridgeCard = useMemo(() => {
    if (!(sellAsset && buyAsset)) return null
    return (
      <>
        <Card
          display='flex'
          alignItems='center'
          justifyContent='space-around'
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

  const handleSubmit = useCallback(() => {
    setBridgeTxid('1234')
    history.push(BridgeRoutePaths.Status)
  }, [history, setBridgeTxid])

  return (
    <SlideTransition>
      <CardHeader display='flex' alignItems='center' gap={2}>
        <Flex flex={1}>
          <IconButton onClick={handleGoBack} variant='ghost' aria-label='back' icon={backIcon} />
        </Flex>
        <Flex textAlign='center'>{translate('common.confirm')}</Flex>
        <Flex flex={1}></Flex>
      </CardHeader>
      <CardBody>
        <Stack spacing={6}>
          {bridgeCard}
          <Timeline>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{sellAsset?.name ?? ''}</Row.Label>
                <Row.Value>{bridgeAmountCryptoPrecision}</Row.Value>
              </CustomRow>
            </TimelineItem>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('common.approvalFee')}</Row.Label>
                <Row.Value>TODO</Row.Value>
              </CustomRow>
            </TimelineItem>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.networkFee')}</Row.Label>
                <Row.Value>
                  <Skeleton isLoaded={true}>
                    <Row.Value>
                      <Amount.Fiat value={'1.23' ?? '0.0'} />
                    </Row.Value>
                  </Skeleton>
                </Row.Value>
              </CustomRow>
            </TimelineItem>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{buyAsset?.name ?? ''}</Row.Label>
                <Row.Value>{bridgeAmountCryptoPrecision}</Row.Value>
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
          size='lg'
          mx={-2}
          colorScheme='blue'
          isLoading={false}
          disabled={false}
          onClick={handleSubmit}
        >
          {/* TODO(gomes): this should be bridge & confirm, along with a cancel button once we wire this up in stake 
              Currently as the part 1 of this, this is implemented as a standalone flow and decoupled from staking
          */}
          {translate('RFOX.confirmAndBridge')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
