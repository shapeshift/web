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
import { foxAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { TransferType } from '@shapeshiftoss/unchained-client'
import type { InterpolationOptions } from 'node-polyglot'
import type { JSX } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { TwirlyToggle } from '../TwirlyToggle'
import { YouCouldHaveSaved } from './components/YouCouldHaveSaved'
import { YouSaved } from './components/YouSaved'

import { Amount } from '@/components/Amount/Amount'
import { AnimatedCheck } from '@/components/AnimatedCheck'
import { AssetIcon } from '@/components/AssetIcon'
import { SlideTransition } from '@/components/SlideTransition'
import { Text } from '@/components/Text'
import { useTxDetails, useTxDetailsQuery } from '@/hooks/useTxDetails/useTxDetails'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { selectRelatedAssetIdsInclusiveSorted } from '@/state/slices/related-assets-selectors'
import { selectLastHopBuyAccountId } from '@/state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuote,
  selectConfirmedTradeExecution,
  selectFirstHop,
  selectIsActiveQuoteMultiHop,
  selectLastHop,
  selectTradeQuoteAffiliateFeeAfterDiscountUserCurrency,
  selectTradeQuoteAffiliateFeeDiscountUserCurrency,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { useAppSelector, useSelectorWithArgs } from '@/state/store'

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

  const firstHop = useAppSelector(selectFirstHop)
  const lastHop = useAppSelector(selectLastHop)
  const tradeExecution = useAppSelector(selectConfirmedTradeExecution)
  const isMultiHop = useAppSelector(selectIsActiveQuoteMultiHop)

  const buyAccountId = useAppSelector(selectLastHopBuyAccountId)

  const feeSavingUserCurrency = useAppSelector(selectTradeQuoteAffiliateFeeDiscountUserCurrency)

  const affiliateFeeUserCurrency = useAppSelector(
    selectTradeQuoteAffiliateFeeAfterDiscountUserCurrency,
  )

  const hasFeeSaving = useMemo(() => bnOrZero(feeSavingUserCurrency).gt(0), [feeSavingUserCurrency])
  const couldHaveReducedFee = !hasFeeSaving && !bnOrZero(affiliateFeeUserCurrency).isZero()

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
    if (!(actualBuyAmountCryptoPrecision && quoteBuyAmountCryptoPrecision)) return undefined

    return bnOrZero(actualBuyAmountCryptoPrecision).minus(quoteBuyAmountCryptoPrecision).gt(0)
      ? bnOrZero(actualBuyAmountCryptoPrecision).minus(quoteBuyAmountCryptoPrecision).toFixed()
      : undefined
  }, [actualBuyAmountCryptoPrecision, quoteBuyAmountCryptoPrecision])

  const { buyAmountAfterFeesCryptoPrecision, buyAmountBeforeFeesCryptoPrecision } = useMemo(() => {
    const { buyAmountBeforeFeesCryptoBaseUnit, buyAmountAfterFeesCryptoBaseUnit } = lastHop ?? {}

    const buyAmountBeforeFeesCryptoPrecision = fromBaseUnit(
      buyAmountBeforeFeesCryptoBaseUnit,
      lastHop?.buyAsset.precision ?? 0,
    )

    const buyAmountAfterFeesCryptoPrecision = fromBaseUnit(
      buyAmountAfterFeesCryptoBaseUnit,
      lastHop?.buyAsset.precision ?? 0,
    )

    return {
      buyAmountBeforeFeesCryptoPrecision,
      buyAmountAfterFeesCryptoPrecision,
    }
  }, [lastHop])

  const feesUpsideCryptoPrecision = useMemo(() => {
    if (!lastHop) return '0'

    return bnOrZero(buyAmountBeforeFeesCryptoPrecision).minus(buyAmountAfterFeesCryptoPrecision)
  }, [lastHop, buyAmountAfterFeesCryptoPrecision, buyAmountBeforeFeesCryptoPrecision])

  const totalUpsideCryptoPrecision = useMemo(() => {
    if (!lastHop) return '0'

    return bnOrZero(feesUpsideCryptoPrecision)
      .plus(maybeExtraDeltaCryptoPrecision ?? 0)
      .toFixed()
  }, [lastHop, maybeExtraDeltaCryptoPrecision, feesUpsideCryptoPrecision])

  const totalUpsidePercentage = useMemo(() => {
    if (!lastHop) return '0'

    return bnOrZero(totalUpsideCryptoPrecision)
      .dividedBy(buyAmountBeforeFeesCryptoPrecision ?? 0)
      .times(100)
      .toFixed()
  }, [lastHop, totalUpsideCryptoPrecision, buyAmountBeforeFeesCryptoPrecision])

  const feesOrTotalUpsideCryptoPrecision = useMemo(() => {
    // Total upside should never be negative, if it is, it means that there was a *downside* in terms of delta, but there may still
    // be a fees "upside" (or lack of downside, rather)
    if (bnOrZero(totalUpsideCryptoPrecision).lte(0) && bnOrZero(feesUpsideCryptoPrecision).gt(0))
      return bnOrZero(feesUpsideCryptoPrecision).toFixed()

    return totalUpsideCryptoPrecision
  }, [totalUpsideCryptoPrecision, feesUpsideCryptoPrecision])

  const feesOrTotalUpsidePercentage = useMemo(() => {
    if (bnOrZero(totalUpsidePercentage).lte(0) && bnOrZero(feesUpsideCryptoPrecision).gt(0))
      return bnOrZero(feesUpsideCryptoPrecision)
        .dividedBy(buyAmountBeforeFeesCryptoPrecision ?? 0)
        .times(100)
        .toFixed()

    return totalUpsidePercentage
  }, [totalUpsidePercentage, feesUpsideCryptoPrecision, buyAmountBeforeFeesCryptoPrecision])

  const relatedAssetIdsFilter = useMemo(
    () => ({
      assetId: foxAssetId,
      onlyConnectedChains: false,
    }),
    [],
  )

  const relatedAssetIds = useSelectorWithArgs(
    selectRelatedAssetIdsInclusiveSorted,
    relatedAssetIdsFilter,
  )

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

  const surplusPercentage = useMemo(() => {
    if (!(actualBuyAmountCryptoPrecision && quoteBuyAmountCryptoPrecision)) return '0'

    return bnOrZero(actualBuyAmountCryptoPrecision)
      .minus(quoteBuyAmountCryptoPrecision)
      .div(quoteBuyAmountCryptoPrecision)
      .times(100)
      .toString()
  }, [actualBuyAmountCryptoPrecision, quoteBuyAmountCryptoPrecision])

  const surplusComponents = useMemo(
    () => ({
      extraPercent: (
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
          <Amount.Percent as='span' value={bnOrZero(surplusPercentage).div(100).toString()} />
          <CText as='span' color='green.200'>
            )
          </CText>
        </Box>
      ),
    }),
    [buyAsset?.symbol, maybeExtraDeltaCryptoPrecision, surplusPercentage],
  )

  const SurplusLine = useCallback(() => {
    if (!buyAsset) return null
    if (!(actualBuyAmountCryptoPrecision && quoteBuyAmountCryptoPrecision)) return null
    if (!maybeExtraDeltaCryptoPrecision) return null
    // Superseeded by the "You Saved" explainer
    if (hasFeeSaving) return null

    // 0.3% min heuristic before showing surplus
    if (bnOrZero(surplusPercentage).lt(0.3)) return null

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
    hasFeeSaving,
    surplusPercentage,
  ])

  // NOTE: This is a temporary solution to enable the Fox discount summary only if the user did NOT

  // trade FOX. If a user trades FOX, the discount calculations will have changed from the correct
  // values because the amount of FOX held in the wallet will have changed.
  // See https://github.com/shapeshift/web/issues/8028 for more details.
  const enableFoxDiscountSummary = useMemo(() => {
    const didTradeFox = relatedAssetIds.some(assetId => {
      return (
        firstHop?.buyAsset.assetId === assetId ||
        firstHop?.sellAsset.assetId === assetId ||
        lastHop?.buyAsset.assetId === assetId ||
        lastHop?.sellAsset.assetId === assetId
      )
    })

    return !didTradeFox
  }, [firstHop, lastHop, relatedAssetIds])

  if (!(buyAsset && sellAsset)) return null

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
            {enableFoxDiscountSummary &&
              hasFeeSaving &&
              bnOrZero(feesOrTotalUpsideCryptoPrecision).gt(0) && (
                <Box px={8}>
                  <YouSaved
                    totalUpsidePercentage={feesOrTotalUpsidePercentage}
                    totalUpsideCryptoPrecision={feesOrTotalUpsideCryptoPrecision}
                    sellAsset={sellAsset}
                    buyAsset={buyAsset}
                  />
                </Box>
              )}
            {couldHaveReducedFee && affiliateFeeUserCurrency && (
              <Box px={8}>
                <YouCouldHaveSaved affiliateFeeUserCurrency={affiliateFeeUserCurrency} />
              </Box>
            )}
          </Flex>
        </SlideTransition>
        <Box px={8}>
          <Button mt={4} size='lg' width='full' onClick={handleBack} colorScheme='blue'>
            {translate(buttonTranslation)}
          </Button>
        </Box>
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
