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
} from '@chakra-ui/react'
import { fromAssetId, toAccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { TransferType } from '@shapeshiftoss/unchained-client'
import type { InterpolationOptions } from 'node-polyglot'
import type { JSX } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { TwirlyToggle } from '../../TwirlyToggle'

import { Amount } from '@/components/Amount/Amount'
import { AnimatedCheck } from '@/components/AnimatedCheck'
import { AssetIcon } from '@/components/AssetIcon'
import { SlideTransition } from '@/components/SlideTransition'
import { Text } from '@/components/Text'
import { useTxDetails, useTxDetailsQuery } from '@/hooks/useTxDetails/useTxDetails'
import { fromBaseUnit } from '@/lib/math'
import {
  selectActiveQuote,
  selectConfirmedTradeExecution,
  selectIsActiveQuoteMultiHop,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { useAppSelector } from '@/state/store'

export type LimitTradeSuccessProps = {
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

const footerPosition: CardFooterProps['position'] = { base: 'sticky', md: 'static' }

export const LimitTradeSuccess = ({
  handleBack,
  titleTranslation,
  buttonTranslation,
  summaryTranslation,
  children,
  sellAmountCryptoPrecision,
  sellAsset,
  buyAsset,
  quoteBuyAmountCryptoPrecision,
}: LimitTradeSuccessProps) => {
  const translate = useTranslate()
  const tradeQuote = useAppSelector(selectActiveQuote)
  const receiveAddress = tradeQuote?.receiveAddress

  const { isOpen, onToggle: handleToggle } = useDisclosure({
    defaultIsOpen: false,
  })

  const tradeExecution = useAppSelector(selectConfirmedTradeExecution)
  const isMultiHop = useAppSelector(selectIsActiveQuoteMultiHop)

  // Get the actual received amount from the buy transaction *if* we can
  // i.e if this isn't a swap to a manual receive addy
  const buyTxId = useMemo(() => {
    if (!tradeExecution || !buyAsset || !receiveAddress) return

    const txHash = isMultiHop
      ? tradeExecution.secondHop?.swap?.buyTxHash
      : tradeExecution.firstHop?.swap?.buyTxHash

    if (!txHash) return

    const { chainId } = fromAssetId(buyAsset.assetId)

    const accountId = toAccountId({
      chainId,
      account: receiveAddress,
    })

    return serializeTxIndex(accountId, txHash, receiveAddress)
  }, [tradeExecution, isMultiHop, buyAsset, receiveAddress])

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

  return (
    <Flex flexDir='column' flex='1' minH={0}>
      <CardBody pb={4} px={0} display='flex' flex='1' flexDir='column'>
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
      <CardFooter
        flexDir='column'
        gap={2}
        px={4}
        borderTop='none'
        position={footerPosition}
        bottom='var(--mobile-nav-offset)'
      >
        <SlideTransition>
          {summaryTranslation && children && (
            <>
              <HStack width='full' justifyContent='space-between'>
                <Button variant='link' onClick={handleToggle} px={2}>
                  {translate(summaryTranslation)}
                </Button>
                <TwirlyToggle isOpen={isOpen} onToggle={handleToggle} />
              </HStack>
              <Box>
                <Collapse in={isOpen}>{children}</Collapse>
              </Box>
            </>
          )}
          <Button mt={2} size='lg' width='full' onClick={handleBack} colorScheme='blue'>
            {translate(buttonTranslation)}
          </Button>
        </SlideTransition>
      </CardFooter>
    </Flex>
  )
}
