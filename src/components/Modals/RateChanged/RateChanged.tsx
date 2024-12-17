import { WarningIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  Heading,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalOverlay,
  Stack,
  Text as CText,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { chainIdToChainDisplayName } from 'lib/utils'
import { selectMarketDataByAssetIdUserCurrency } from 'state/slices/marketDataSlice/selectors'
import { selectLastHop } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export type RateChangedModalProps = {
  prevAmountCryptoBaseUnit: string
}

export const RateChangedModal = ({ prevAmountCryptoBaseUnit }: RateChangedModalProps) => {
  const rateChanged = useModal('rateChanged')
  const { close, isOpen } = rateChanged
  const translate = useTranslate()
  const lastHop = useAppSelector(selectLastHop)

  // Mostly to content TS - if we end up here, we *have* a last hop
  if (!lastHop) throw new Error('No last hop found')

  const buyAsset = lastHop.buyAsset

  const chainDisplayName = useMemo(
    () => chainIdToChainDisplayName(buyAsset.chainId),
    [buyAsset.chainId],
  )

  const buyAssetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, buyAsset.assetId),
  )

  const prevAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(prevAmountCryptoBaseUnit, buyAsset.precision),
    [buyAsset.precision, prevAmountCryptoBaseUnit],
  )
  const amountCryptoPrecision = useMemo(
    () => fromBaseUnit(lastHop.buyAmountAfterFeesCryptoBaseUnit, buyAsset.precision),
    [buyAsset.precision, lastHop.buyAmountAfterFeesCryptoBaseUnit],
  )

  const prevAmountUserCurrency = useMemo(
    () => bn(prevAmountCryptoPrecision).times(buyAssetMarketDataUserCurrency.price).toFixed(2),
    [buyAssetMarketDataUserCurrency.price, prevAmountCryptoPrecision],
  )

  const amountUserCurrency = useMemo(
    () => bn(amountCryptoPrecision).times(buyAssetMarketDataUserCurrency.price).toFixed(2),
    [amountCryptoPrecision, buyAssetMarketDataUserCurrency.price],
  )

  const percentageDifferenceHuman = useMemo(() => {
    return bn(amountCryptoPrecision)
      .minus(prevAmountCryptoPrecision)
      .div(prevAmountCryptoPrecision)
      .times(100)
      .toFixed(2)
  }, [prevAmountCryptoPrecision, amountCryptoPrecision])

  const percentageDifferenceColor = useMemo(() => {
    if (bn(percentageDifferenceHuman).isZero()) return 'text.subtle'

    return bn(percentageDifferenceHuman).gt(0) ? 'text.success' : 'text.error'
  }, [percentageDifferenceHuman])

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered size='sm'>
      <ModalOverlay />
      <ModalContent maxW='440px'>
        <ModalBody display='flex' alignItems='center' py={12} flexDir='column' gap={6}>
          <WarningIcon color='text.warning' boxSize={8} />
          <Stack textAlign='center' width='full' spacing={3}>
            <Heading size='sm'>{translate('trade.rates.rateExpired.title')}</Heading>
            <Text translation='trade.rates.rateExpired.body' color='text.subtle' />
          </Stack>
          <Box width='full' bg='gray.700' borderRadius='xl' p={4}>
            <Flex direction='column' gap={4}>
              <Flex alignItems='center'>
                <AssetIcon size='sm' assetId={buyAsset.assetId} />
                <Box ml={3}>
                  <CText color='gray.400' fontWeight='bold'>
                    <Amount.Crypto value={prevAmountCryptoPrecision} symbol={buyAsset.symbol} />
                  </CText>
                  <Flex color='gray.500' as={CText}>
                    <Amount.Fiat value={prevAmountUserCurrency} />
                    <Box as='span' ml={1}>
                      on {chainDisplayName}
                    </Box>
                  </Flex>
                </Box>
              </Flex>

              <Flex justify='space-between' alignItems='center'>
                <Flex alignItems='center'>
                  <AssetIcon size='sm' assetId={buyAsset.assetId} />
                  <Box ml={3}>
                    <CText color='gray.200' fontWeight='bold'>
                      <Amount.Crypto value={amountCryptoPrecision} symbol={buyAsset.symbol} />
                    </CText>
                    <Flex color='gray.500' as={CText}>
                      <Amount.Fiat value={amountUserCurrency} />
                      <Box as='span' ml={1}>
                        on {chainDisplayName}
                      </Box>
                    </Flex>
                  </Box>
                </Flex>
                <CText color={percentageDifferenceColor}>({percentageDifferenceHuman}%)</CText>
              </Flex>
            </Flex>
          </Box>
        </ModalBody>
        <ModalFooter pb={6}>
          <Button onClick={close} colorScheme='blue' width='full'>
            {translate('trade.rates.rateExpired.cta')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
