import { ArrowForwardIcon, ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons'
import { Button, Circle, Collapse, Divider, Stack, useDisclosure } from '@chakra-ui/react'
import { Summary } from 'features/defi/components/Summary'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { WrappedIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'

import { BridgeState } from '../types'

export const Status = () => {
  const translate = useTranslate()
  const { isOpen, onToggle } = useDisclosure()
  const { control } = useFormContext<BridgeState>()

  const [asset, cryptoAmount, fromChain, toChain] = useWatch({
    control,
    name: ['asset', 'cryptoAmount', 'fromChain', 'toChain'],
  })
  return (
    <SlideTransition>
      <Card variant='unstyled'>
        <Card.Header px={0} pt={0}>
          <Card.Heading textAlign='center'>
            <Text translation='bridge.transferring' />
          </Card.Heading>
        </Card.Header>
        <Stack spacing={0} justifyContent='center'>
          <Stack py={8} spacing={6}>
            <Stack direction='row' alignItems='center' justifyContent='center'>
              <WrappedIcon glow size='md' src={asset?.icon} wrapColor={fromChain?.color} />
              <Divider width='50px' />
              <CircularProgress isIndeterminate={true} size={8}>
                <Circle size={8} position='absolute' top={0} left={0} fontSize='md'>
                  <ArrowForwardIcon />
                </Circle>
              </CircularProgress>
              <Divider width='50px' />
              <WrappedIcon glow size='md' src={asset?.icon} wrapColor={toChain?.color} />
            </Stack>
            <Stack justifyContent='center' alignItems='center' spacing={0}>
              <Amount.Crypto
                fontSize='xl'
                value={cryptoAmount ?? '0'}
                symbol={asset?.symbol ?? ''}
              />
              <Stack direction='row' justifyContent='center' alignItems='center' color='gray.500'>
                <RawText>{fromChain?.name}</RawText>
                <ArrowForwardIcon />
                <RawText>{toChain?.name}</RawText>
              </Stack>
            </Stack>
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
                      <WrappedIcon glow size='sm' src={asset?.icon} wrapColor={fromChain?.color} />
                      <Stack spacing={0} alignItems='flex-start' justifyContent='center'>
                        <RawText>{asset?.symbol}</RawText>
                        <RawText fontSize='sm' color='gray.500'>
                          {fromChain?.name}
                        </RawText>
                      </Stack>
                    </Stack>
                    {asset?.symbol && (
                      <Row.Value color='red.400'>
                        <Amount.Crypto
                          prefix='-'
                          value={cryptoAmount ?? '0'}
                          symbol={asset.symbol}
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
                      <WrappedIcon glow size='sm' src={asset?.icon} wrapColor={toChain?.color} />
                      <Stack spacing={0} alignItems='flex-start' justifyContent='center'>
                        <RawText>{asset?.symbol}</RawText>
                        <RawText fontSize='sm' color='gray.500'>
                          {toChain?.name}
                        </RawText>
                      </Stack>
                    </Stack>
                    {asset?.symbol && (
                      <Row.Value color='green.200'>
                        <Amount.Crypto
                          prefix='+'
                          value={cryptoAmount ?? '0'}
                          symbol={asset.symbol}
                        />
                      </Row.Value>
                    )}
                  </Row>
                </Row>
                <Stack spacing={0}>
                  <Row variant='gutter'>
                    <Row.Label>Total Approx. Wait Time</Row.Label>
                    <Row.Value>~5-10 minutes</Row.Value>
                  </Row>
                  <Row variant='gutter'>
                    <Row.Label>Route</Row.Label>
                    <Row.Value>Axelar</Row.Value>
                  </Row>
                  <Row variant='gutter'>
                    <Row.Label>Receive Address</Row.Label>
                    <Row.Value>123</Row.Value>
                  </Row>
                  <Row variant='gutter'>
                    <Row.Label>
                      <Text translation='modals.confirm.estimatedGas' />
                    </Row.Label>
                    <Row.Value>
                      <Stack textAlign='right' spacing={0}>
                        <Amount.Fiat fontWeight='bold' value={'7.00'} />
                        <Amount.Crypto
                          color='gray.500'
                          value={'0.02'}
                          symbol={asset?.symbol ?? ''}
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
