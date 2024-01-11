import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Button,
  Card,
  CardFooter,
  CardHeader,
  Center,
  Divider,
  Flex,
  FormLabel,
  IconButton,
  Stack,
  StackDivider,
} from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo } from 'react'
import { FaPlus } from 'react-icons/fa6'
import { useHistory } from 'react-router'
import { usdcAssetId } from 'components/Modals/FiatRamps/config'
import { TradeAssetSelect } from 'components/MultiHopTrade/components/AssetSelection'
import { SlippagePopover } from 'components/MultiHopTrade/components/SlippagePopover'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DepositType } from './components/DepositType'
import { ReadOnlyAsset } from './components/ReadOnlyAsset'

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

export const AddLiquidity = () => {
  const asset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const asset2 = useAppSelector(state => selectAssetById(state, usdcAssetId))
  const history = useHistory()
  const divider = useMemo(() => <StackDivider borderColor='border.base' />, [])

  const handleAssetChange = useCallback((asset: Asset) => {
    console.info(asset)
  }, [])

  const handleBackClick = useCallback(() => {
    history.push('/pools')
  }, [history])

  const handleAccountIdChange = useCallback(() => {
    console.info('account change')
  }, [])

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

  return (
    <Card width='100%' maxWidth='md'>
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
      </Stack>
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
          Add Liquidity
        </Button>
      </CardFooter>
    </Card>
  )
}
