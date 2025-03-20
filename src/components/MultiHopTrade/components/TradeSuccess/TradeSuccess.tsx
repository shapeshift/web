import { ArrowForwardIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  CardBody,
  CardFooter,
  Collapse,
  Divider,
  Flex,
  HStack,
  Icon,
  Stack,
  Text as CText,
  useDisclosure,
} from '@chakra-ui/react'
import { fromAssetId, toAccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { TransferType } from '@shapeshiftoss/unchained-client'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { TwirlyToggle } from '../TwirlyToggle'

import { Amount } from '@/components/Amount/Amount'
import { AnimatedCheck } from '@/components/AnimatedCheck'
import { AssetIcon } from '@/components/AssetIcon'
import { SlideTransition } from '@/components/SlideTransition'
import { Text } from '@/components/Text'
import { useTxDetails, useTxDetailsQuery } from '@/hooks/useTxDetails/useTxDetails'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import {
  selectActiveQuote,
  selectConfirmedTradeExecution,
  selectIsActiveQuoteMultiHop,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { useAppSelector } from '@/state/store'

export type TradeSuccessProps = {
  handleBack: () => void
  children?: JSX.Element
  titleTranslation: string | [string, InterpolationOptions]
  buttonTranslation: string | [string, InterpolationOptions]
  summaryTranslation?: string | [string, InterpolationOptions]
  sellAsset?: Asset
  buyAsset?: Asset
  sellAmountCryptoPrecision?: string
  quoteBuyAmountCryptoPrecision?: string
  extraContent?: JSX.Element
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
  quoteBuyAmountCryptoPrecision,
  extraContent,
}: TradeSuccessProps) => {
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

  const buyAssetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, buyAsset?.assetId ?? ''),
  )

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
    if (!(actualBuyAmountCryptoPrecision && quoteBuyAmountCryptoPrecision)) return undefined

    return bnOrZero(actualBuyAmountCryptoPrecision).minus(quoteBuyAmountCryptoPrecision).gt(0)
      ? bnOrZero(actualBuyAmountCryptoPrecision).minus(quoteBuyAmountCryptoPrecision).toString()
      : undefined
  }, [actualBuyAmountCryptoPrecision, quoteBuyAmountCryptoPrecision])

  const maybeExraDeltaUserCurrency = useMemo(() => {
    if (!maybeExtraDeltaCryptoPrecision || !buyAsset) return undefined

    return bnOrZero(maybeExtraDeltaCryptoPrecision)
      .times(buyAssetMarketDataUserCurrency?.price ?? 0)
      .toString()
  }, [buyAssetMarketDataUserCurrency, maybeExtraDeltaCryptoPrecision, buyAsset])

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

  const surplusComponents = useMemo(
    () => ({
      extra: (
        <Box color='green.200' display='inline'>
          <Amount.Crypto
            as='span'
            fontWeight='medium'
            symbol={buyAsset?.symbol ?? ''}
            value={maybeExtraDeltaCryptoPrecision}
          />
          <CText as='span' color='green.200'>
            {' '}
            (
          </CText>
          <Amount.Fiat as='span' value={maybeExraDeltaUserCurrency} />
          <CText as='span' color='green.200'>
            )
          </CText>
        </Box>
      ),
    }),
    [buyAsset?.symbol, maybeExraDeltaUserCurrency, maybeExtraDeltaCryptoPrecision],
  )

  const SurplusLine = useCallback(() => {
    if (!buyAsset) return null
    if (!(actualBuyAmountCryptoPrecision && quoteBuyAmountCryptoPrecision)) return null
    if (!maybeExtraDeltaCryptoPrecision) return null

    return (
      <Flex justifyContent='center' alignItems='center' flexWrap='wrap' gap={2} px={4}>
        <Text translation='trade.tradeCompleteSurplus' components={surplusComponents} />
      </Flex>
    )
  }, [
    buyAsset,
    quoteBuyAmountCryptoPrecision,
    actualBuyAmountCryptoPrecision,
    surplusComponents,
    maybeExtraDeltaCryptoPrecision,
  ])

  return (
    <>
      <CardBody pb={4} px={0}>
        <SlideTransition>
          <Flex flexDir='column' alignItems='center' textAlign='center' py={8} gap={6}>
            <Stack alignItems='center'>
              <AnimatedCheck boxSize={12} />
              <Text translation={titleTranslation} fontWeight='bold' />
            </Stack>
            <AmountsLine />
            <SurplusLine />
          </Flex>
        </SlideTransition>
        <Stack gap={4} px={8}>
          <Button mt={4} size='lg' width='full' onClick={handleBack} colorScheme='blue'>
            {translate(buttonTranslation)}
          </Button>
          {extraContent}
        </Stack>
      </CardBody>
      {summaryTranslation && children && (
        <>
          <Divider />
          <CardFooter flexDir='column' gap={2} px={8}>
            <SlideTransition>
              <HStack width='full' justifyContent='space-between'>
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
        </>
      )}
    </>
  )
}
