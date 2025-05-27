import { Avatar, Button, ButtonGroup, Link, Progress, Stack } from '@chakra-ui/react'
import type { SwapperName } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import React, { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { SwapperIcons } from '@/components/MultiHopTrade/components/SwapperIcons'
import { Row } from '@/components/Row/Row'
import { RawText } from '@/components/Text'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
type SwapDetailsProps = {
  isStreaming?: boolean
  sellAmountCryptoBaseUnit: string
  buyAmountCryptoBaseUnit: string
  sellAsset: Asset
  buyAsset: Asset
  swapperName: SwapperName
  txLink?: string
}

export const SwapDetails: React.FC<SwapDetailsProps> = ({
  isStreaming,
  sellAmountCryptoBaseUnit,
  buyAmountCryptoBaseUnit,
  sellAsset,
  buyAsset,
  swapperName,
  txLink,
}) => {
  const translate = useTranslate()
  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const sellAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(sellAmountCryptoBaseUnit, sellAsset.precision),
    [sellAmountCryptoBaseUnit, sellAsset.precision],
  )

  const buyAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(buyAmountCryptoBaseUnit, buyAsset.precision),
    [buyAmountCryptoBaseUnit, buyAsset.precision],
  )

  const sellAmountCryptoFormatted = useMemo(
    () => toCrypto(sellAmountCryptoPrecision, sellAsset.symbol),
    [sellAmountCryptoPrecision, toCrypto, sellAsset],
  )

  const buyAmountCryptoFormatted = useMemo(
    () => toCrypto(buyAmountCryptoPrecision, buyAsset.symbol),
    [buyAmountCryptoPrecision, toCrypto, buyAsset],
  )

  return (
    <Stack gap={4}>
      <Row fontSize='sm'>
        <Row.Label>{translate('notificationCenter.swap')}</Row.Label>
        <Row.Value>
          <RawText>{`${sellAmountCryptoFormatted} → ${buyAmountCryptoFormatted}`}</RawText>
        </Row.Value>
      </Row>
      <Row fontSize='sm'>
        <Row.Label>{translate('notificationCenter.protocol')}</Row.Label>
        <Row.Value display='flex' alignItems='center' gap={2}>
          <SwapperIcons swapperName={swapperName} swapSource={undefined} />
          <RawText>{swapperName}</RawText>
        </Row.Value>
      </Row>
      {isStreaming && (
        <Row fontSize='sm'>
          <Row.Label>{translate('notificationCenter.streamingStatus')}</Row.Label>
          <Row.Value display='flex' alignItems='center' gap={2}>
            <Progress width='100px' size='xs' value={50} colorScheme='green' />
            <RawText>(2/5)</RawText>
          </Row.Value>
        </Row>
      )}
      {txLink && (
        <ButtonGroup width='full' size='sm'>
          <Button width='full' as={Link} isExternal href={txLink}>
            {translate('notificationCenter.viewTransaction')}
          </Button>
        </ButtonGroup>
      )}
    </Stack>
  )
}
