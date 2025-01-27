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

import { TwirlyToggle } from '../TwirlyToggle'

export type TradeSuccessProps = {
  handleBack: () => void
  children?: JSX.Element
  titleTranslation: string | [string, InterpolationOptions]
  buttonTranslation: string | [string, InterpolationOptions]
  summaryTranslation?: string | [string, InterpolationOptions]
  sellAsset?: Asset
  buyAsset?: Asset
  sellAmountCryptoPrecision?: string
  buyAmountCryptoPrecision?: string
}

export const TradeSuccess = ({
  handleBack,
  titleTranslation,
  buttonTranslation,
  summaryTranslation,
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

  return (
    <>
      <CardBody pb={0} px={0}>
        <SlideTransition>
          <Flex flexDir='column' alignItems='center' textAlign='center' py={8} gap={6}>
            <Stack alignItems='center'>
              <AnimatedCheck boxSize={12} />
              <Text translation={titleTranslation} fontWeight='bold' />
            </Stack>
            <AmountsLine />
          </Flex>
        </SlideTransition>
        <Stack gap={4} px={8}>
          <Button mt={4} size='lg' width='full' onClick={handleBack} colorScheme='blue'>
            {translate(buttonTranslation)}
          </Button>
        </Stack>
      </CardBody>
      {summaryTranslation && children && (
        <CardFooter flexDir='column' gap={2} px={8}>
          <SlideTransition>
            <HStack width='full' justifyContent='space-between' mt={4}>
              <Button variant='link' onClick={handleToggle} px={2}>
                {translate(summaryTranslation)}
              </Button>
              <TwirlyToggle isOpen={isOpen} onToggle={handleToggle} />
            </HStack>
            <Box>
              <Collapse in={isOpen}>{children}</Collapse>
            </Box>
          </SlideTransition>
        </CardFooter>
      )}
    </>
  )
}
