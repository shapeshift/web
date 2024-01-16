import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Center,
  Flex,
  IconButton,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import { ethAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import prettyMilliseconds from 'pretty-ms'
import { useCallback, useMemo } from 'react'
import { FaPlus } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { usdcAssetId } from 'test/mocks/accounts'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { Timeline, TimelineItem } from 'components/Timeline/Timeline'

import { PoolIcon } from '../PoolIcon'
import { AddLiquidityRoutePaths } from './types'

const dividerStyle = {
  marginLeft: '-1.2em',
  marginRight: '-1.2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0,
  opacity: 1,
  zIndex: 4,
}

export const AddLiquidityConfirm = () => {
  const translate = useTranslate()
  const history = useHistory()
  const backIcon = useMemo(() => <ArrowBackIcon />, [])
  const assetIds = useMemo(() => [ethAssetId, usdcAssetId], [])
  const handleBack = useCallback(() => {
    history.push(AddLiquidityRoutePaths.Input)
  }, [history])
  const handleConfirm = useCallback(() => {
    history.push(AddLiquidityRoutePaths.Status)
  }, [history])
  const divider = useMemo(() => {
    return (
      <Flex style={dividerStyle}>
        <Center borderRadius='full' bg='background.surface.base' boxSize='42px'>
          <Center boxSize='42px' borderRadius='full' bg='background.surface.raised.base'>
            <Card
              display='flex'
              boxSize='35px'
              alignItems='center'
              justifyContent='center'
              borderRadius='full'
              color='text.subtle'
              flexShrink={0}
              fontSize='xs'
            >
              <FaPlus />
            </Card>
          </Center>
        </Center>
      </Flex>
    )
  }, [])
  return (
    <SlideTransition>
      <CardHeader display='flex' alignItems='center' gap={2}>
        <Flex flex={1}>
          <IconButton onClick={handleBack} variant='ghost' aria-label='back' icon={backIcon} />
        </Flex>
        <Flex textAlign='center'>{translate('common.confirm')}</Flex>
        <Flex flex={1}></Flex>
      </CardHeader>
      <CardBody pt={0}>
        <Stack spacing={8}>
          <Stack direction='row' divider={divider} position='relative'>
            <Card
              display='flex'
              alignItems='center'
              justifyContent='center'
              flexDir='column'
              gap={4}
              py={6}
              px={4}
              flex={1}
            >
              <AssetIcon size='sm' assetId={usdcAssetId} />
              <Stack textAlign='center' spacing={0}>
                <Amount.Crypto fontWeight='bold' value='100' symbol='USDC' />
                <Amount.Fiat fontSize='sm' color='text.subtle' value='100' />
              </Stack>
            </Card>
            <Card
              display='flex'
              alignItems='center'
              justifyContent='center'
              flexDir='column'
              gap={4}
              py={6}
              px={4}
              flex={1}
            >
              <AssetIcon size='sm' assetId={thorchainAssetId} />
              <Stack textAlign='center' spacing={0}>
                <Amount.Crypto fontWeight='bold' value='100' symbol='RUNE' />
                <Amount.Fiat fontSize='sm' color='text.subtle' value='100' />
              </Stack>
            </Card>
          </Stack>
          <Timeline>
            <TimelineItem>
              <Row fontSize='sm' fontWeight='medium'>
                <Row.Label>{translate('pools.chainFee', { chain: 'ShapeShift' })}</Row.Label>
                <Row.Value>Free</Row.Value>
              </Row>
            </TimelineItem>
            <TimelineItem>
              <Row fontSize='sm' fontWeight='medium'>
                <Row.Label>{translate('pools.chainFee', { chain: 'THORChain' })}</Row.Label>
                <Row.Value display='flex' gap={1}>
                  <Amount.Crypto value='0.02' symbol='RUNE' />
                  <Flex color='text.subtle'>
                    {'('}
                    <Amount.Fiat value='10.00' />
                    {')'}
                  </Flex>
                </Row.Value>
              </Row>
            </TimelineItem>
            <TimelineItem>
              <Row fontSize='sm' fontWeight='medium'>
                <Row.Label>{translate('pools.chainFee', { chain: 'Ethereum' })}</Row.Label>
                <Row.Value display='flex' gap={1}>
                  <Amount.Crypto value='0.02' symbol='ETH' />
                  <Flex color='text.subtle'>
                    {'('}
                    <Amount.Fiat value='10.00' />
                    {')'}
                  </Flex>
                </Row.Value>
              </Row>
            </TimelineItem>
            <TimelineItem>
              <Row fontSize='sm'>
                <Row.Label>{translate('pools.shareOfPool')}</Row.Label>
                <Row.Value>
                  <Amount.Percent value='0.2' />
                </Row.Value>
              </Row>
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
        py={4}
        bg='background.surface.raised.accent'
      >
        <Row fontSize='sm'>
          <Row.Label>{translate('pools.pool')}</Row.Label>
          <Row.Value>
            <Flex gap={2} alignItems='center' justifyContent='center'>
              <PoolIcon size='xs' assetIds={assetIds} />
              <RawText fontWeight='medium'>ETH/USDC</RawText>
            </Flex>
          </Row.Value>
        </Row>
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.slippage')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={true}>
              <Amount.Crypto value={'0'} symbol={'USDC'} />
            </Skeleton>
          </Row.Value>
        </Row>
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('bridge.waitTimeLabel')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={true}>
              <RawText fontWeight='bold'>{prettyMilliseconds(0)}</RawText>
            </Skeleton>
          </Row.Value>
        </Row>
      </CardFooter>
      <CardFooter
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={4}
        px={6}
        bg='background.surface.raised.accent'
        borderBottomRadius='xl'
      >
        <Button mx={-2} size='lg' colorScheme='blue' onClick={handleConfirm}>
          {translate('pools.confirmAndDeposit')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
