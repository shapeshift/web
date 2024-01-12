import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  CardFooter,
  CardHeader,
  Center,
  Collapse,
  Divider,
  Flex,
  FormLabel,
  IconButton,
  Skeleton,
  Stack,
  StackDivider,
} from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import prettyMilliseconds from 'pretty-ms'
import { useCallback, useMemo } from 'react'
import { BiSolidBoltCircle } from 'react-icons/bi'
import { FaPlus } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { usdcAssetId } from 'components/Modals/FiatRamps/config'
import { TradeAssetSelect } from 'components/MultiHopTrade/components/AssetSelection'
import { SlippagePopover } from 'components/MultiHopTrade/components/SlippagePopover'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DepositType } from './components/DepositType'
import { PoolSummary } from './components/PoolSummary'
import { ReadOnlyAsset } from './components/ReadOnlyAsset'
import { AddLiquidityRoutePaths } from './types'

const buttonProps = { flex: 1, justifyContent: 'space-between' }

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

type AddLiquidityInputProps = {
  headerComponent?: JSX.Element
}

export const AddLiquidityInput: React.FC<AddLiquidityInputProps> = ({ headerComponent }) => {
  const translate = useTranslate()
  const { history: browserHistory } = useBrowserRouter()
  const asset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const asset2 = useAppSelector(state => selectAssetById(state, usdcAssetId))
  const history = useHistory()
  const divider = useMemo(() => <StackDivider borderColor='border.base' />, [])

  const handleAssetChange = useCallback((asset: Asset) => {
    console.info(asset)
  }, [])

  const handleBackClick = useCallback(() => {
    browserHistory.push('/pools')
  }, [browserHistory])

  const handleAccountIdChange = useCallback(() => {
    console.info('account change')
  }, [])

  const handleSubmit = useCallback(() => {
    history.push(AddLiquidityRoutePaths.Confirm)
  }, [history])

  const percentOptions = useMemo(() => [], [])

  const backIcon = useMemo(() => <ArrowBackIcon />, [])

  const pairDivider = useMemo(() => {
    return (
      <Flex alignItems='center' display='flex' style={dividerStyle} pl={6}>
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
    if (headerComponent) {
      return headerComponent
    }
    return (
      <CardHeader display='flex' alignItems='center' justifyContent='space-between'>
        <IconButton
          onClick={handleBackClick}
          variant='ghost'
          icon={backIcon}
          aria-label='go back'
        />
        Add Liquidity
        <SlippagePopover />
      </CardHeader>
    )
  }, [backIcon, handleBackClick, headerComponent])

  return (
    <SlideTransition>
      {renderHeader}
      <Stack divider={divider} spacing={4} pb={4}>
        <Stack>
          <FormLabel px={6} mb={0} fontSize='sm'>
            Select pair
          </FormLabel>
          <TradeAssetSelect
            assetId={ethAssetId}
            onAssetChange={handleAssetChange}
            isLoading={false}
            mb={0}
            buttonProps={buttonProps}
          />
          <TradeAssetSelect
            assetId={usdcAssetId}
            onAssetChange={handleAssetChange}
            isLoading={false}
            mb={0}
            buttonProps={buttonProps}
          />
        </Stack>
        <Stack>
          <FormLabel mb={0} px={6} fontSize='sm'>
            Deposit amounts
          </FormLabel>
          <DepositType />
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
        <Collapse in={true}>
          <PoolSummary />
        </Collapse>
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
        <Alert status='info' mx={-2} width='auto'>
          <AlertIcon as={BiSolidBoltCircle} />
          <AlertDescription fontSize='sm' fontWeight='medium'>
            {translate('pools.symAlert', { from: 'USDC', to: 'ETH' })}
          </AlertDescription>
        </Alert>
        <Button mx={-2} size='lg' colorScheme='blue' onClick={handleSubmit}>
          Add Liquidity
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
