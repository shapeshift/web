import { ArrowForwardIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  CardBody,
  CardFooter,
  Collapse,
  Flex,
  HStack,
  Icon,
  Stack,
  useDisclosure,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AnimatedCheck } from 'components/AnimatedCheck'
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
  sellAsset?: Asset
  buyAsset?: Asset
  sellAmountCryptoPrecision?: string
  buyAmountCryptoPrecision?: string
}

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
      <Flex justifyContent='center' alignItems='center' flexWrap='wrap' gap={2} px={4}>
        <Flex alignItems='center' gap={2}>
          <AssetIcon size='xs' assetId={sellAsset?.assetId} />
          <Amount.Crypto
            whiteSpace='nowrap'
            value={sellAmountCryptoPrecision}
            symbol={sellAsset.symbol}
          />
        </Flex>
        <Icon as={ArrowForwardIcon} boxSize={4} color='text.subtle' />
        <Flex alignItems='center' gap={2}>
          <AssetIcon size='xs' assetId={buyAsset?.assetId} />
          <Amount.Crypto
            whiteSpace='nowrap'
            value={buyAmountCryptoPrecision}
            symbol={buyAsset.symbol}
          />
        </Flex>
      </Flex>
    )
  }, [sellAsset, buyAsset, sellAmountCryptoPrecision, buyAmountCryptoPrecision])

  if (!lastHop) return null

  return (
    <>
      <CardBody pb={0} px={0}>
        <SlideTransition>
          <Flex flexDir='column' alignItems='center' textAlign='center' py={8} gap={6}>
            <Stack alignItems='center'>
              <AnimatedCheck boxSize={12} />
              <Text translation={titleTranslation ?? 'trade.temp.tradeSuccess'} fontWeight='bold' />
            </Stack>
            <AmountsLine />
          </Flex>
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
          <Box>
            <Collapse in={isOpen}>{children}</Collapse>
          </Box>
        </SlideTransition>
      </CardFooter>
    </>
  )
}
