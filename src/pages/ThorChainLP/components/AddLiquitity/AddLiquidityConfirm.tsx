import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Button,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  IconButton,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import prettyMilliseconds from 'pretty-ms'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { usdcAssetId } from 'test/mocks/accounts'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'

import { PoolIcon } from '../PoolIcon'
import { AddLiquidityRoutePaths } from './types'

export const AddLiquidityConfirm = () => {
  const translate = useTranslate()
  const history = useHistory()
  const backIcon = useMemo(() => <ArrowBackIcon />, [])
  const assetIds = useMemo(() => [ethAssetId, usdcAssetId], [])
  const handleBack = useCallback(() => {
    history.push(AddLiquidityRoutePaths.Input)
  }, [history])
  return (
    <SlideTransition>
      <CardHeader display='flex' alignItems='center' gap={2}>
        <IconButton onClick={handleBack} variant='ghost' aria-label='back' icon={backIcon} />
        {translate('common.confirm')}
      </CardHeader>
      <CardBody>
        <Stack spacing={8}>
          <Flex gap={2} alignItems='center' justifyContent='center'>
            <PoolIcon size='sm' assetIds={assetIds} />
            <RawText fontWeight='medium'>ETH/USDC</RawText>
          </Flex>
          <Stack fontSize='sm' fontWeight='medium'>
            <Row>
              <Row.Label>{translate('pools.assetDepositAmount', { asset: 'USDC' })}</Row.Label>
              <Row.Value>
                <Amount.Crypto value='100' symbol='USDC' />
              </Row.Value>
            </Row>
            <Row>
              <Row.Label>{translate('pools.shareOfPool')}</Row.Label>
              <Row.Value>
                <Amount.Percent value='0.2' />
              </Row.Value>
            </Row>
          </Stack>
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
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.slippage')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={true}>
              <Amount.Crypto value={'0'} symbol={'USDC'} />
            </Skeleton>
          </Row.Value>
        </Row>
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.gasFee')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={true}>
              <Amount.Fiat value={'0'} />
            </Skeleton>
          </Row.Value>
        </Row>
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.fees')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={true}>
              <Amount.Fiat value={'0'} />
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
        <Button mx={-2} size='lg' colorScheme='blue'>
          Confirm and Deposit
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
