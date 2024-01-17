import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Button,
  ButtonGroup,
  CardFooter,
  CardHeader,
  Center,
  Divider,
  Flex,
  FormLabel,
  IconButton,
  Skeleton,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  StackDivider,
} from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import prettyMilliseconds from 'pretty-ms'
import React, { useCallback, useMemo } from 'react'
import { FaPlus } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { usdcAssetId } from 'components/Modals/FiatRamps/config'
import { SlippagePopover } from 'components/MultiHopTrade/components/SlippagePopover'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { AsymSide } from 'pages/ThorChainLP/hooks/useUserLpData'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { LpType } from '../LpType'
import { ReadOnlyAsset } from '../ReadOnlyAsset'
import type { RemoveLiquidityProps } from './RemoveLiquidity'
import { RemoveLiquidityRoutePaths } from './types'

const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
  paddingTop: 0,
}
const dividerStyle = {
  borderBottomWidth: 0,
  marginBottom: 8,
  marginTop: 12,
}

export const RemoveLiquidityInput: React.FC<RemoveLiquidityProps> = ({ headerComponent }) => {
  const translate = useTranslate()
  const { history: browserHistory } = useBrowserRouter()
  const asset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const asset2 = useAppSelector(state => selectAssetById(state, usdcAssetId))
  const history = useHistory()
  const divider = useMemo(() => <StackDivider borderColor='border.base' />, [])

  const handleBackClick = useCallback(() => {
    browserHistory.push('/pools')
  }, [browserHistory])

  const handleAccountIdChange = useCallback(() => {
    console.info('account change')
  }, [])

  const handleSubmit = useCallback(() => {
    history.push(RemoveLiquidityRoutePaths.Confirm)
  }, [history])

  const percentOptions = useMemo(() => [], [])

  const backIcon = useMemo(() => <ArrowBackIcon />, [])

  const pairDivider = useMemo(() => {
    return (
      <Flex alignItems='center' display='flex' style={dividerStyle}>
        <Divider borderColor='border.base' />
        <Center
          boxSize='32px'
          borderWidth={1}
          borderColor='border.base'
          borderRadius='full'
          color='text.subtle'
          flexShrink={0}
          fontSize='xs'
        >
          <FaPlus />
        </Center>
        <Divider borderColor='border.base' />
      </Flex>
    )
  }, [])

  const renderHeader = useMemo(() => {
    if (headerComponent) return headerComponent
    return (
      <CardHeader display='flex' alignItems='center' justifyContent='space-between'>
        <IconButton
          onClick={handleBackClick}
          variant='ghost'
          icon={backIcon}
          aria-label='go back'
        />
        {translate('pools.addLiquidity')}
        <SlippagePopover />
      </CardHeader>
    )
  }, [backIcon, handleBackClick, headerComponent, translate])

  return (
    <SlideTransition>
      {renderHeader}
      <Stack divider={divider} spacing={4} pb={4}>
        <Stack>
          <FormLabel mb={0} px={6} fontSize='sm'>
            {translate('pools.removeAmounts')}
          </FormLabel>
          <LpType assetId={ethAssetId} asymSide={AsymSide.Asset} />
          <Stack px={6} py={4} spacing={4}>
            <Amount.Percent value='0.02' fontSize='2xl' />
            <Slider>
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
            <ButtonGroup size='sm' justifyContent='space-between'>
              <Button flex={1}>25%</Button>
              <Button flex={1}>50%</Button>
              <Button flex={1}>75%</Button>
              <Button flex={1}>Max</Button>
            </ButtonGroup>
          </Stack>
          <Divider borderColor='border.base' />
          <Stack divider={pairDivider} spacing={0}>
            <TradeAssetInput
              assetId={ethAssetId}
              assetIcon={asset?.icon ?? ''}
              assetSymbol={asset?.symbol ?? ''}
              onAccountIdChange={handleAccountIdChange}
              percentOptions={percentOptions}
              rightComponent={ReadOnlyAsset}
              formControlProps={formControlProps}
            />
            <TradeAssetInput
              assetId={usdcAssetId}
              assetIcon={asset2?.icon ?? ''}
              assetSymbol={asset2?.symbol ?? ''}
              onAccountIdChange={handleAccountIdChange}
              percentOptions={percentOptions}
              rightComponent={ReadOnlyAsset}
              formControlProps={formControlProps}
            />
          </Stack>
        </Stack>
      </Stack>
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
        <Button mx={-2} size='lg' colorScheme='blue' onClick={handleSubmit}>
          {translate('pools.removeLiquidity')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
