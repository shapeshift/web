import { CheckCircleIcon } from '@chakra-ui/icons'
import { Box, Button, ButtonGroup, Link, Stack } from '@chakra-ui/react'
import type { Swap } from '@shapeshiftoss/swapper'
import { SwapStatus } from '@shapeshiftoss/swapper'
import { bnOrZero } from '@shapeshiftoss/utils'
import React, { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { StreamingSwapDetails } from './StreamingSwapDetails'

import { HoverTooltip } from '@/components/HoverTooltip/HoverTooltip'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { TxLabel } from '@/components/MultiHopTrade/components/TradeConfirm/TxLabel'
import { Row } from '@/components/Row/Row'
import { RawText } from '@/components/Text'
import { useActualBuyAmountCryptoPrecision } from '@/hooks/useActualBuyAmountCryptoPrecision'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useResizeObserver } from '@/hooks/useResizeObserver/useResizeObserver'
import type { SwapAction } from '@/state/slices/actionSlice/types'

const EXECUTION_PRICE_MAX_DECIMALS = 6
const EXECUTION_PRICE_SIGNIFICANT_DIGITS = 4

// Keeps the amount's unbroken width from stretching the card, so overflow is measured against the card width
const valueContainerSx = { contain: 'inline-size' }

type SwapDetailsProps = {
  txLink?: string
  swap: Swap
  action: SwapAction
}

export const SwapDetails: React.FC<SwapDetailsProps> = ({ txLink, action, swap }) => {
  const translate = useTranslate()
  const actualBuyAmountCryptoPrecision = useActualBuyAmountCryptoPrecision(swap?.id)
  const {
    number: { toCrypto },
  } = useLocaleFormatter()
  const { setNode: setAmountMeasureNode, entry: amountMeasureEntry } = useResizeObserver()

  const isAmountOverflowing = amountMeasureEntry
    ? amountMeasureEntry.target.scrollWidth > amountMeasureEntry.target.clientWidth
    : false

  const {
    sellAsset,
    buyAsset,
    sellAccountId,
    isStreaming,
    swapperName,
    sellTxHash,
    buyTxHash,
    sellAmountCryptoPrecision,
    status,
  } = swap
  const { swapMetadata } = action

  const txHash = buyTxHash || sellTxHash

  const maybeExecutionPriceRow = useMemo(() => {
    if (status !== SwapStatus.Success || !actualBuyAmountCryptoPrecision) return null

    const executionPrice = bnOrZero(actualBuyAmountCryptoPrecision).div(sellAmountCryptoPrecision)

    // Sub-1 rates keep significant digits rather than a fixed number of decimals, so tiny rates never round to 0
    const isSubUnitPrice = executionPrice.lt(1)

    const displayExecutionPrice = isSubUnitPrice
      ? executionPrice.precision(EXECUTION_PRICE_SIGNIFICANT_DIGITS)
      : executionPrice

    const maximumFractionDigits = isSubUnitPrice
      ? displayExecutionPrice.decimalPlaces() ?? EXECUTION_PRICE_MAX_DECIMALS
      : EXECUTION_PRICE_MAX_DECIMALS

    // bn() rounds to BigNumber's DECIMAL_PLACES, so rates smaller than that would render as 0
    if (bnOrZero(displayExecutionPrice).isZero()) return null

    const executionPriceCryptoFormatted = toCrypto(displayExecutionPrice, buyAsset.symbol, {
      maximumFractionDigits,
      omitDecimalTrailingZeros: true,
    })

    const executionPriceFormatted = `1 ${sellAsset.symbol} = ${executionPriceCryptoFormatted}`

    return (
      <Row fontSize='sm' alignItems='center' gap={4}>
        <Row.Label>{translate('actionCenter.executionPrice')}</Row.Label>
        <Box flex={1} textAlign='right' sx={valueContainerSx}>
          {/* Hidden copy of the amount at full width, overflowing only when it can't fit on its own line.
              Keyed on the text so a new amount remounts it and gets re-measured. */}
          <Box
            key={executionPriceCryptoFormatted}
            ref={setAmountMeasureNode}
            aria-hidden
            height={0}
            overflow='hidden'
            whiteSpace='nowrap'
            visibility='hidden'
          >
            {executionPriceCryptoFormatted}
          </Box>
          {isAmountOverflowing ? (
            <HoverTooltip placement='top' label={executionPriceFormatted}>
              <RawText fontSize='sm' width='full'>
                {`1 ${sellAsset.symbol} = … ${buyAsset.symbol}`}
              </RawText>
            </HoverTooltip>
          ) : (
            <RawText fontSize='sm'>
              {`1 ${sellAsset.symbol} = `}
              <RawText as='span' whiteSpace='nowrap'>
                {executionPriceCryptoFormatted}
              </RawText>
            </RawText>
          )}
        </Box>
      </Row>
    )
  }, [
    translate,
    toCrypto,
    setAmountMeasureNode,
    isAmountOverflowing,
    sellAsset.symbol,
    buyAsset.symbol,
    status,
    actualBuyAmountCryptoPrecision,
    sellAmountCryptoPrecision,
  ])

  if (swapMetadata?.isPermit2Required || swapMetadata?.allowanceApproval?.txHash) {
    return (
      <Stack gap={4}>
        <Row fontSize='sm' alignItems='center'>
          <Row.Label>
            {translate(
              swapMetadata?.isPermit2Required ? 'common.permit2Approval' : 'common.approval',
            )}
          </Row.Label>
          <Row.Value>
            {swapMetadata.allowanceApproval?.txHash ? (
              <TxLabel
                txHash={swapMetadata.allowanceApproval.txHash}
                explorerBaseUrl={sellAsset.explorerTxLink}
                accountId={sellAccountId}
              />
            ) : (
              <CheckCircleIcon color='green.500' />
            )}
          </Row.Value>
        </Row>
        {txHash && (
          <Row fontSize='sm' alignItems='center'>
            <Row.Label>{translate('trade.hopTitle.swap', { swapperName })}</Row.Label>
            <Row.Value>
              {txLink ? (
                <Link isExternal href={txLink} color='text.link'>
                  <MiddleEllipsis value={txHash} />
                </Link>
              ) : (
                <MiddleEllipsis value={txHash} />
              )}
            </Row.Value>
          </Row>
        )}
        {maybeExecutionPriceRow}
      </Stack>
    )
  }

  return (
    <Stack gap={4}>
      {isStreaming && <StreamingSwapDetails swap={swap} />}
      {maybeExecutionPriceRow}
      {txLink && (
        <ButtonGroup width='full' size='sm'>
          <Button width='full' as={Link} isExternal href={txLink}>
            {translate('actionCenter.viewTransaction')}
          </Button>
        </ButtonGroup>
      )}
    </Stack>
  )
}
