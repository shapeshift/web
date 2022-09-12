import {
  ArrowForwardIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
} from '@chakra-ui/icons'
import { Button, Circle, Collapse, Divider, Stack, useDisclosure } from '@chakra-ui/react'
import { Summary } from 'features/defi/components/Summary'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { WrappedIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { useAppSelector } from 'state/store'

import type { BridgeState } from '../types'
import { BridgeRoutePaths } from '../types'

export const Status = () => {
  const { reset } = useFormContext<BridgeState>()
  const history = useHistory()
  const translate = useTranslate()
  const [status, setStatus] = useState('pending')
  const { isOpen, onToggle } = useDisclosure()
  const { control } = useFormContext<BridgeState>()

  const [bridgeAsset, cryptoAmount, fromChain, toChain, relayerFeeUsdc, receiveAddress] = useWatch({
    control,
    name: ['asset', 'cryptoAmount', 'fromChain', 'toChain', 'relayerFeeUsdc', 'receiveAddress'],
  })

  const { price: bridgeTokenPrice } = useAppSelector(state =>
    selectMarketDataById(state, bridgeAsset?.assetId ?? ''),
  )

  // TODO: Actually wait for TX to complete
  useEffect(() => {
    setTimeout(() => {
      setStatus('success')
    }, 4000)
  }, [])

  const { statusIcon, statusText, statusBg } = (() => {
    let statusIcon: React.ReactElement = <ArrowForwardIcon />
    let statusText = 'bridge.transferring'
    let statusBg = 'transparent'
    if (status === 'success') {
      statusText = 'bridge.transferComplete'
      statusIcon = <CheckIcon color='white' />
      statusBg = 'green.500'
    }
    if (status === 'failed') {
      statusText = 'bridge.failed'
      statusIcon = <CloseIcon color='white' />
      statusBg = 'red.500'
    }
    return { statusIcon, statusText, statusBg }
  })()

  const handleContinue = () => {
    reset()
    history.push(BridgeRoutePaths.Input)
  }

  const transferFeeNativeToken = bnOrZero(relayerFeeUsdc)
    .dividedBy(bnOrZero(bridgeTokenPrice))
    .valueOf()

  return (
    <SlideTransition>
      <Card variant='unstyled'>
        <Card.Header px={0} pt={0}>
          <Card.Heading textAlign='center'>
            <Text translation={statusText} />
          </Card.Heading>
        </Card.Header>
        <Stack spacing={0} justifyContent='center'>
          <Stack py={8} spacing={6}>
            <Stack direction='row' alignItems='center' justifyContent='center'>
              <WrappedIcon glow size='md' src={bridgeAsset?.icon} wrapColor={fromChain?.color} />
              <Divider width='50px' />
              <CircularProgress isIndeterminate={true} size={8}>
                <Circle bg={statusBg} size={8} position='absolute' top={0} left={0} fontSize='md'>
                  {statusIcon}
                </Circle>
              </CircularProgress>
              <Divider width='50px' />
              <WrappedIcon glow size='md' src={bridgeAsset?.icon} wrapColor={toChain?.color} />
            </Stack>
            <Stack justifyContent='center' alignItems='center' spacing={0}>
              <Amount.Crypto
                fontSize='xl'
                value={cryptoAmount ?? '0'}
                symbol={bridgeAsset?.symbol ?? ''}
              />
              <Stack direction='row' justifyContent='center' alignItems='center' color='gray.500'>
                <RawText>{fromChain?.name}</RawText>
                <ArrowForwardIcon />
                <RawText>{toChain?.name}</RawText>
              </Stack>
            </Stack>
            {status === 'success' && (
              <Button size='lg' colorScheme='blue' onClick={handleContinue}>
                {translate('bridge.bridgeAnother')}
              </Button>
            )}
          </Stack>

          <Stack spacing={0}>
            <Button
              justifyContent='space-between'
              onClick={onToggle}
              variant='ghost'
              fontSize='md'
              py={6}
              px={6}
              rightIcon={isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
            >
              {translate(isOpen ? 'common.hideDetails' : 'common.showDetails')}
            </Button>

            <Collapse in={isOpen}>
              <Summary>
                <Row variant='vert-gutter'>
                  <Row.Label>
                    <Text translation='common.send' />
                  </Row.Label>
                  <Row px={0} fontWeight='medium'>
                    <Stack direction='row' alignItems='center'>
                      <WrappedIcon
                        glow
                        size='sm'
                        src={bridgeAsset?.icon}
                        wrapColor={fromChain?.color}
                      />
                      <Stack spacing={0} alignItems='flex-start' justifyContent='center'>
                        <RawText>{bridgeAsset?.symbol}</RawText>
                        <RawText fontSize='sm' color='gray.500'>
                          {fromChain?.name}
                        </RawText>
                      </Stack>
                    </Stack>
                    {bridgeAsset?.symbol && (
                      <Row.Value color='red.400'>
                        <Amount.Crypto
                          prefix='-'
                          value={cryptoAmount ?? '0'}
                          symbol={bridgeAsset.symbol}
                        />
                      </Row.Value>
                    )}
                  </Row>
                </Row>
                <Row variant='vert-gutter'>
                  <Row.Label>
                    <Text translation='common.receive' />
                  </Row.Label>
                  <Row px={0} fontWeight='medium' alignItems='center'>
                    <Stack direction='row' alignItems='center'>
                      <WrappedIcon
                        glow
                        size='sm'
                        src={bridgeAsset?.icon}
                        wrapColor={toChain?.color}
                      />
                      <Stack spacing={0} alignItems='flex-start' justifyContent='center'>
                        <RawText>{bridgeAsset?.symbol}</RawText>
                        <RawText fontSize='sm' color='gray.500'>
                          {toChain?.name}
                        </RawText>
                      </Stack>
                    </Stack>
                    {bridgeAsset?.symbol && (
                      <Row.Value color='green.200'>
                        <Amount.Crypto
                          prefix='+'
                          value={cryptoAmount ?? '0'}
                          symbol={bridgeAsset.symbol}
                        />
                      </Row.Value>
                    )}
                  </Row>
                </Row>
                <Stack spacing={0}>
                  <Row variant='gutter'>
                    <Row.Label>{translate('bridge.waitTimeLabel')}</Row.Label>
                    <Row.Value>{translate('bridge.waitTimeValue')}</Row.Value>
                  </Row>
                  <Row variant='gutter'>
                    <Row.Label>{translate('bridge.route')}</Row.Label>
                    <Row.Value>Axelar</Row.Value>
                  </Row>
                  <Row variant='gutter'>
                    <Row.Label>{translate('bridge.receiveAddress')}</Row.Label>
                    <Row.Value>
                      <MiddleEllipsis value={receiveAddress ?? ''} />
                    </Row.Value>
                  </Row>
                  <Row variant='gutter'>
                    <Row.Label>
                      <Text translation='common.relayerGasFee' />
                    </Row.Label>
                    <Row.Value>
                      <Stack textAlign='right' spacing={0}>
                        <Amount.Fiat fontWeight='bold' value={relayerFeeUsdc ?? '0'} />
                        <Amount.Crypto
                          color='gray.500'
                          value={transferFeeNativeToken ?? '0'}
                          symbol={bridgeAsset?.symbol ?? ''}
                        />
                      </Stack>
                    </Row.Value>
                  </Row>
                </Stack>
              </Summary>
            </Collapse>
          </Stack>
        </Stack>
      </Card>
    </SlideTransition>
  )
}
