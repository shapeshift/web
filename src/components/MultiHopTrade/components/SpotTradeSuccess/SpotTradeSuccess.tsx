import { ArrowForwardIcon } from '@chakra-ui/icons'
import type { CardFooterProps } from '@chakra-ui/react'
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
  useMediaQuery,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { TransferType } from '@shapeshiftoss/unchained-client'
import type { InterpolationOptions } from 'node-polyglot'
import type { JSX } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { TwirlyToggle } from '../TwirlyToggle'
import { YouGotMore } from './components/YouGotMore'

import { Amount } from '@/components/Amount/Amount'
import { AnimatedCheck } from '@/components/AnimatedCheck'
import { AssetIcon } from '@/components/AssetIcon'
import { SlideTransition } from '@/components/SlideTransition'
import { Text } from '@/components/Text'
import { useTxDetails, useTxDetailsQuery } from '@/hooks/useTxDetails/useTxDetails'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { selectLastHopBuyAccountId } from '@/state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuote,
  selectConfirmedTradeExecution,
  selectIsActiveQuoteMultiHop,
  selectLastHop,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

export type SpotTradeSuccessProps = {
  handleBack: () => void
  children?: JSX.Element
  titleTranslation: string | [string, InterpolationOptions]
  buttonTranslation: string | [string, InterpolationOptions]
  summaryTranslation?: string | [string, InterpolationOptions]
  sellAsset?: Asset
  buyAsset?: Asset
  sellAmountCryptoPrecision?: string
  quoteBuyAmountCryptoPrecision?: string
}

const cardFooterPx = { base: 4, md: 8 }
const youGotMoreMarginBottom = { base: 0, md: 4 }

const footerPosition: CardFooterProps['position'] = { base: 'sticky', md: 'static' }

export const SpotTradeSuccess = ({
  handleBack,
  titleTranslation,
  buttonTranslation,
  summaryTranslation,
  children,
  sellAmountCryptoPrecision,
  sellAsset,
  buyAsset,
  quoteBuyAmountCryptoPrecision,
}: SpotTradeSuccessProps) => {
  const translate = useTranslate()
  const tradeQuote = useAppSelector(selectActiveQuote)
  const receiveAddress = tradeQuote?.receiveAddress

  const { isOpen, onToggle: handleToggle } = useDisclosure({
    defaultIsOpen: false,
  })

  const lastHop = useAppSelector(selectLastHop)
  const tradeExecution = useAppSelector(selectConfirmedTradeExecution)
  const isMultiHop = useAppSelector(selectIsActiveQuoteMultiHop)

  const buyAccountId = useAppSelector(selectLastHopBuyAccountId)

  // Get the actual received amount from the buy transaction *if* we can
  // i.e if this isn't a swap to a manual receive addy
  const buyTxId = useMemo(() => {
    if (!tradeExecution || !receiveAddress || !buyAccountId) return

    const txHash = isMultiHop
      ? tradeExecution.secondHop?.swap?.buyTxHash
      : tradeExecution.firstHop?.swap?.buyTxHash

    if (!txHash) return

    return serializeTxIndex(buyAccountId, txHash, receiveAddress)
  }, [tradeExecution, isMultiHop, receiveAddress, buyAccountId])

  const txTransfers = useTxDetails(buyTxId ?? '')?.transfers
  const manualReceiveAddressTransfers = useTxDetailsQuery(buyTxId ?? '')?.transfers
  const transfers = txTransfers || manualReceiveAddressTransfers

  const actualBuyAmountCryptoPrecision = useMemo(() => {
    if (!transfers?.length || !buyAsset) return undefined

    const receiveTransfer = transfers.find(
      transfer => transfer.type === TransferType.Receive && transfer.assetId === buyAsset.assetId,
    )
    return receiveTransfer?.value
      ? fromBaseUnit(receiveTransfer.value, buyAsset.precision)
      : undefined
  }, [transfers, buyAsset])

  const maybeExtraDeltaCryptoPrecision = useMemo(() => {
    if (!(actualBuyAmountCryptoPrecision && quoteBuyAmountCryptoPrecision)) return '0'

    return bnOrZero(actualBuyAmountCryptoPrecision).minus(quoteBuyAmountCryptoPrecision).gt(0)
      ? bnOrZero(actualBuyAmountCryptoPrecision).minus(quoteBuyAmountCryptoPrecision).toFixed()
      : '0'
  }, [actualBuyAmountCryptoPrecision, quoteBuyAmountCryptoPrecision])

  const { buyAmountBeforeFeesCryptoPrecision } = useMemo(() => {
    const { buyAmountBeforeFeesCryptoBaseUnit } = lastHop ?? {}

    const buyAmountBeforeFeesCryptoPrecision = fromBaseUnit(
      buyAmountBeforeFeesCryptoBaseUnit,
      lastHop?.buyAsset.precision ?? 0,
    )

    return {
      buyAmountBeforeFeesCryptoPrecision,
    }
  }, [lastHop])

  const maybeExtraDeltaPercentage = useMemo(() => {
    if (!lastHop) return '0'

    return bnOrZero(maybeExtraDeltaCryptoPrecision)
      .dividedBy(buyAmountBeforeFeesCryptoPrecision ?? 0)
      .times(100)
      .toFixed()
  }, [lastHop, buyAmountBeforeFeesCryptoPrecision, maybeExtraDeltaCryptoPrecision])

  const AmountsLine = useCallback(() => {
    if (!(sellAsset && buyAsset)) return null
    if (!(sellAmountCryptoPrecision && quoteBuyAmountCryptoPrecision)) return null

    const displayAmount = actualBuyAmountCryptoPrecision || quoteBuyAmountCryptoPrecision

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
          <Amount.Crypto whiteSpace='nowrap' value={displayAmount} symbol={buyAsset.symbol} />
        </Flex>
      </Flex>
    )
  }, [
    sellAsset,
    buyAsset,
    sellAmountCryptoPrecision,
    quoteBuyAmountCryptoPrecision,
    actualBuyAmountCryptoPrecision,
  ])

  const [isSmallerThanMd] = useMediaQuery(`(max-width: ${breakpoints.md})`, { ssr: false })

  if (!(buyAsset && sellAsset)) return null

  return (
    <Flex flexDir='column' flex='1' minH={0}>
      <CardBody pb={4} px={0} flex='1'>
        <SlideTransition>
          <Flex flexDir='column' alignItems='center' textAlign='center' py={8} gap={6}>
            <Stack alignItems='center'>
              <AnimatedCheck boxSize={12} />
              <Text translation={titleTranslation} fontWeight='bold' />
            </Stack>
            <AmountsLine />
          </Flex>
        </SlideTransition>
      </CardBody>
      {summaryTranslation && children && (
        <>
          <Box px={cardFooterPx} mb={youGotMoreMarginBottom}>
            {bnOrZero(maybeExtraDeltaCryptoPrecision).gt(0) &&
              bnOrZero(maybeExtraDeltaPercentage).gt(0.3) && (
                <Box width='full'>
                  <YouGotMore
                    extraDeltePercentage={maybeExtraDeltaPercentage}
                    extraDeltaCryptoPrecision={maybeExtraDeltaCryptoPrecision}
                    sellAsset={sellAsset}
                    buyAsset={buyAsset}
                  />
                </Box>
              )}
          </Box>
          <CardFooter
            flexDir='column'
            gap={2}
            px={cardFooterPx}
            position={footerPosition}
            bottom='var(--mobile-nav-offset)'
            backgroundColor={isSmallerThanMd ? 'background.surface.base' : undefined}
          >
            <SlideTransition>
              <HStack width='full' justifyContent='space-between'>
                <Button variant='link' onClick={handleToggle}>
                  {typeof summaryTranslation === 'string'
                    ? translate(summaryTranslation)
                    : translate(...summaryTranslation)}
                </Button>
                <TwirlyToggle isOpen={isOpen} onToggle={handleToggle} />
              </HStack>
              <Box>
                <Collapse in={isOpen}>{children}</Collapse>
              </Box>
            </SlideTransition>

            <Button mt={4} size='lg' width='full' onClick={handleBack} colorScheme='blue'>
              {typeof buttonTranslation === 'string'
                ? translate(buttonTranslation)
                : translate(...buttonTranslation)}
            </Button>
          </CardFooter>
        </>
      )}
    </Flex>
  )
}
