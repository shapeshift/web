import { ArrowForwardIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  CardBody,
  CardFooter,
  Collapse,
  HStack,
  Icon,
  Stack,
  useDisclosure,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback } from 'react'
import { FaRegCircleCheck } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { selectLastHop } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { TwirlyToggle } from '../TwirlyToggle'

export type TradeSuccessProps = {
  handleBack: () => void
  children: JSX.Element
  titleTranslation?: string | [string, InterpolationOptions]
} & (
  | {
      sellAsset: never
      buyAsset: never
      sellAmountCryptoPrecision: never
      buyAmountCryptoPrecision: never
    }
  | {
      sellAsset?: Asset
      buyAsset?: Asset
      sellAmountCryptoPrecision?: string
      buyAmountCryptoPrecision?: string
    }
)

export const TradeSuccess = ({
  handleBack,
  titleTranslation,
  children,
  sellAmountCryptoPrecision,
  sellAsset,
  buyAsset,
  buyAmountCryptoPrecision,
}: TradeSuccessProps) => {
  const translate = useTranslate()

  const { isOpen, onToggle: handleToggle } = useDisclosure({
    defaultIsOpen: false,
  })

  const lastHop = useAppSelector(selectLastHop)

  const AmountsLine = useCallback(() => {
    if (!(sellAsset && buyAsset)) return null
    if (!(sellAmountCryptoPrecision && buyAmountCryptoPrecision)) return null

    return (
      <HStack justifyContent='center'>
        <Stack
          flexDirection='row'
          alignItems='center'
          justifyContent='flex-end'
          spacing={2}
          width='50%'
        >
          <AssetIcon size='sm' assetId={sellAsset?.assetId} />
          <Amount.Crypto value={sellAmountCryptoPrecision} symbol={sellAsset.symbol} />
        </Stack>
        <Icon as={ArrowForwardIcon} boxSize={5} mx={2} color='text.subtle' />
        <Stack
          flexDirection='row'
          alignItems='center'
          justifyContent='flex-start'
          spacing={2}
          width='50%'
        >
          <AssetIcon size='sm' assetId={buyAsset?.assetId} />
          <Amount.Crypto value={buyAmountCryptoPrecision} symbol={buyAsset.symbol} />
        </Stack>
      </HStack>
    )
  }, [sellAsset, buyAsset, sellAmountCryptoPrecision, buyAmountCryptoPrecision])

  if (!lastHop) return null

  return (
    <>
      <CardBody pb={0} px={0}>
        <SlideTransition>
          <Box textAlign='center' py={4}>
            <Icon as={FaRegCircleCheck} color='green.500' boxSize={12} />
            <Text
              translation={titleTranslation ?? 'trade.temp.tradeSuccess'}
              fontWeight='bold'
              mb={4}
            />
            <AmountsLine />
          </Box>
        </SlideTransition>
      </CardBody>
      <CardFooter flexDir='column' gap={2} px={4}>
        <SlideTransition>
          <Button mt={4} size='lg' width='full' onClick={handleBack} colorScheme='blue'>
            {translate('trade.doAnotherTrade')}
          </Button>
          <HStack width='full' justifyContent='space-between' mt={4}>
            <Button variant='link' onClick={handleToggle} px={2}>
              {translate('trade.summary')}
            </Button>
            <TwirlyToggle isOpen={isOpen} onToggle={handleToggle} />
          </HStack>
          <Box mx={-4}>
            <Collapse in={isOpen}>{children}</Collapse>
          </Box>
        </SlideTransition>
      </CardFooter>
    </>
  )
}
