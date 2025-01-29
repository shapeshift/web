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
  useDisclosure,
} from '@chakra-ui/react'
import { foxAssetId, foxOnArbitrumOneAssetId, foxOnGnosisAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AnimatedCheck } from 'components/AnimatedCheck'
import { AssetIcon } from 'components/AssetIcon'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectFirstHop,
  selectLastHop,
  selectTradeQuoteAffiliateFeeAfterDiscountUserCurrency,
  selectTradeQuoteAffiliateFeeDiscountUserCurrency,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { TwirlyToggle } from '../TwirlyToggle'
import { YouCouldHaveSaved } from './components/YouCouldHaveSaved'
import { YouSaved } from './components/YouSaved'

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

  const firstHop = useAppSelector(selectFirstHop)
  const lastHop = useAppSelector(selectLastHop)

  const feeSavingUserCurrency = useAppSelector(selectTradeQuoteAffiliateFeeDiscountUserCurrency)

  const affiliateFeeUserCurrency = useAppSelector(
    selectTradeQuoteAffiliateFeeAfterDiscountUserCurrency,
  )

  const hasFeeSaving = !bnOrZero(feeSavingUserCurrency).isZero()
  const couldHaveReducedFee = !hasFeeSaving && !bnOrZero(affiliateFeeUserCurrency).isZero()

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

  // NOTE: This is a temporary solution to enable the Fox discount summary only if the user did NOT

  // trade FOX. If a user trades FOX, the discount calculations will have changed from the correct
  // values because the amount of FOX held in the wallet will have changed.
  // See https://github.com/shapeshift/web/issues/8028 for more details.
  const enableFoxDiscountSummary = useMemo(() => {
    const foxAssetIds = [foxAssetId, foxOnGnosisAssetId, foxOnArbitrumOneAssetId]
    const didTradeFox = foxAssetIds.some(assetId => {
      return (
        firstHop?.buyAsset.assetId === assetId ||
        firstHop?.sellAsset.assetId === assetId ||
        lastHop?.buyAsset.assetId === assetId ||
        lastHop?.sellAsset.assetId === assetId
      )
    })

    return !didTradeFox
  }, [firstHop, lastHop])

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
          </Flex>
        </SlideTransition>
        <Stack gap={4} px={8}>
          <Button mt={4} size='lg' width='full' onClick={handleBack} colorScheme='blue'>
            {translate(buttonTranslation)}
          </Button>
          {enableFoxDiscountSummary && hasFeeSaving && (
            <YouSaved feeSavingUserCurrency={enableFoxDiscountSummary && feeSavingUserCurrency!} />
          )}
          {couldHaveReducedFee && (
            <YouCouldHaveSaved affiliateFeeUserCurrency={affiliateFeeUserCurrency!} />
          )}
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
