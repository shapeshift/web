import { CloseIcon, ExternalLinkIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { Center, Flex, IconButton, Link, Progress, Tag, Td, Text, Tr } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { assertGetCowNetwork, COW_SWAP_VAULT_RELAYER_ADDRESS } from '@shapeshiftoss/swapper'
import type { Trade } from '@shapeshiftoss/types'
import { OrderStatus } from '@shapeshiftoss/types'
import { BigAmount, bn, bnOrZero } from '@shapeshiftoss/utils'
import { skipToken, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { formatDistanceToNow } from 'date-fns'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { ChainIcon } from '@/components/ChainMenu'
import { RawText } from '@/components/Text'
import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import { getConfig } from '@/config'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { assertGetChainAdapter } from '@/lib/utils'
import { useAllowance } from '@/react-queries/hooks/useAllowance'
import { selectAssetById, selectPortfolioCryptoBalanceByFilter } from '@/state/slices/selectors'
import { useSelectorWithArgs } from '@/state/store'

const getAdaptivePrecision = (value: string | number): number => {
  const absValue = bnOrZero(value).abs()

  if (absValue.gte(10000)) return 2
  if (absValue.gte(1000)) return 3
  if (absValue.gte(100)) return 4
  if (absValue.gte(10)) return 5

  return 6
}

export type LimitOrderCardProps = {
  uid: string
  buyAmountCryptoBaseUnit: string
  sellAmountCryptoBaseUnit: string
  buyAssetId: AssetId
  sellAssetId: AssetId
  validTo?: number
  filledDecimalPercentage: number
  status: OrderStatus
  accountId: AccountId
  onCancelClick?: (uid: string) => void
  executedBuyAmountCryptoBaseUnit?: string
  executedSellAmountCryptoBaseUnit?: string
}

const closeIcon = <CloseIcon />
const iconButtonSx = {
  svg: {
    width: '10px',
    height: '10px',
  },
}

const fontSize = {
  base: 'xs',
  sm: 'sm',
}

const truncateProps = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const

export const LimitOrderCard: FC<LimitOrderCardProps> = ({
  uid,
  buyAmountCryptoBaseUnit,
  sellAmountCryptoBaseUnit,
  buyAssetId,
  sellAssetId,
  validTo,
  filledDecimalPercentage,
  status,
  accountId,
  onCancelClick,
  executedBuyAmountCryptoBaseUnit,
  executedSellAmountCryptoBaseUnit,
}) => {
  const translate = useTranslate()

  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const buyAsset = useSelectorWithArgs(selectAssetById, buyAssetId)
  const sellAsset = useSelectorWithArgs(selectAssetById, sellAssetId)
  const explorerTxLink = buyAsset?.explorerTxLink
  const isFulfilled = status === OrderStatus.FULFILLED

  const { data: tradeTxLink } = useQuery({
    queryKey: ['cowTrade', uid],
    queryFn:
      isFulfilled && explorerTxLink
        ? () => {
            const chainId = fromAccountId(accountId).chainId
            const network = assertGetCowNetwork(chainId)
            return axios.get<Trade[]>(
              `${getConfig().VITE_COWSWAP_BASE_URL}/${network}/api/v1/trades?orderUid=${uid}`,
            )
          }
        : skipToken,
    select: data => {
      const txHash = data?.data?.[0]?.txHash
      return `${explorerTxLink}/${txHash}`
    },
  })

  const maybeExternalLink = useMemo(() => {
    return (
      <Link href={tradeTxLink ?? ''} isExternal>
        <ExternalLinkIcon mb='1px' />
      </Link>
    )
  }, [tradeTxLink])

  const filter = useMemo(() => {
    return {
      accountId,
      assetId: sellAssetId,
    }
  }, [accountId, sellAssetId])

  const sellAssetBalance = useSelectorWithArgs(selectPortfolioCryptoBalanceByFilter, filter)

  const sellAmountCrypto = useMemo(
    () =>
      BigAmount.fromBaseUnit({
        value: sellAmountCryptoBaseUnit,
        precision: sellAsset?.precision ?? 0,
      }),
    [sellAmountCryptoBaseUnit, sellAsset?.precision],
  )

  const buyAmountCrypto = useMemo(
    () =>
      BigAmount.fromBaseUnit({
        value: buyAmountCryptoBaseUnit,
        precision: buyAsset?.precision ?? 0,
      }),
    [buyAmountCryptoBaseUnit, buyAsset?.precision],
  )

  const hasSufficientBalance = useMemo(() => {
    return sellAssetBalance.gte(sellAmountCrypto)
  }, [sellAmountCrypto, sellAssetBalance])

  const from = useMemo(() => {
    return fromAccountId(accountId).account
  }, [accountId])

  const { data: allowanceOnChainCryptoBaseUnit } = useAllowance({
    assetId: sellAssetId,
    spender: COW_SWAP_VAULT_RELAYER_ADDRESS,
    from,
    amountCryptoBaseUnit: sellAmountCryptoBaseUnit,
    // Don't fetch allowance if there is insufficient balance, because we wont display the allowance
    // warning in this case.
    isDisabled: !hasSufficientBalance || status !== OrderStatus.OPEN,
    isRefetchEnabled: true,
  })

  const hasSufficientAllowance = useMemo(() => {
    // If the request failed, default to true since this is just a helper and not safety critical.
    if (!allowanceOnChainCryptoBaseUnit) return true

    return bn(sellAmountCryptoBaseUnit).lte(allowanceOnChainCryptoBaseUnit)
  }, [allowanceOnChainCryptoBaseUnit, sellAmountCryptoBaseUnit])

  const handleCancel = useCallback(() => {
    onCancelClick?.(uid)
  }, [onCancelClick, uid])

  const sellAmountCryptoPrecision = useMemo(
    () => sellAmountCrypto.toPrecision(),
    [sellAmountCrypto],
  )

  const buyAmountCryptoPrecision = useMemo(() => buyAmountCrypto.toPrecision(), [buyAmountCrypto])

  const sellAmountCryptoFormatted = useMemo(
    () => toCrypto(sellAmountCryptoPrecision, sellAsset?.symbol ?? ''),
    [sellAmountCryptoPrecision, toCrypto, sellAsset],
  )

  const buyAmountCryptoFormatted = useMemo(
    () => toCrypto(buyAmountCryptoPrecision, buyAsset?.symbol ?? ''),
    [buyAmountCryptoPrecision, toCrypto, buyAsset],
  )

  const executedBuyAmountCrypto = useMemo(
    () =>
      executedBuyAmountCryptoBaseUnit
        ? BigAmount.fromBaseUnit({
            value: executedBuyAmountCryptoBaseUnit,
            precision: buyAsset?.precision ?? 0,
          })
        : BigAmount.zero({ precision: buyAsset?.precision ?? 0 }),
    [executedBuyAmountCryptoBaseUnit, buyAsset?.precision],
  )

  const executedBuyAmountCryptoPrecision = useMemo(
    () => executedBuyAmountCrypto.toPrecision(),
    [executedBuyAmountCrypto],
  )

  const executedSellAmountCrypto = useMemo(
    () =>
      executedSellAmountCryptoBaseUnit
        ? BigAmount.fromBaseUnit({
            value: executedSellAmountCryptoBaseUnit,
            precision: sellAsset?.precision ?? 0,
          })
        : BigAmount.zero({ precision: sellAsset?.precision ?? 0 }),
    [executedSellAmountCryptoBaseUnit, sellAsset?.precision],
  )

  const executedSellAmountCryptoPrecision = useMemo(
    () => executedSellAmountCrypto.toPrecision(),
    [executedSellAmountCrypto],
  )

  const limitPrice = useMemo(() => {
    return bn(buyAmountCryptoPrecision).div(sellAmountCryptoPrecision).toFixed()
  }, [buyAmountCryptoPrecision, sellAmountCryptoPrecision])

  const executionPrice = useMemo(() => {
    if (!executedBuyAmountCryptoPrecision || !executedSellAmountCryptoPrecision) return '0'
    return bn(executedBuyAmountCryptoPrecision).div(executedSellAmountCryptoPrecision).toFixed()
  }, [executedBuyAmountCryptoPrecision, executedSellAmountCryptoPrecision])

  const limitPriceCryptoFormatted = useMemo(
    () => toCrypto(limitPrice, buyAsset?.symbol ?? ''),
    [limitPrice, toCrypto, buyAsset],
  )

  const sellAmountPrecision = useMemo(
    () => getAdaptivePrecision(sellAmountCryptoPrecision),
    [sellAmountCryptoPrecision],
  )

  const buyAmountPrecision = useMemo(
    () => getAdaptivePrecision(buyAmountCryptoPrecision),
    [buyAmountCryptoPrecision],
  )

  const displayPrice = isFulfilled ? executionPrice : limitPrice

  const displayPricePrecision = useMemo(() => getAdaptivePrecision(displayPrice), [displayPrice])

  const tagColorScheme = useMemo(() => {
    switch (status) {
      case OrderStatus.OPEN:
        return 'blue'
      case OrderStatus.FULFILLED:
        return 'green'
      case OrderStatus.CANCELLED:
        return 'red'
      case OrderStatus.EXPIRED:
        return 'yellow'
      default:
        return 'gray'
    }
  }, [status])

  const barColorScheme = useMemo(() => {
    switch (status) {
      case OrderStatus.OPEN:
      case OrderStatus.FULFILLED:
        return 'green'
      case OrderStatus.CANCELLED:
        return 'red'
      case OrderStatus.EXPIRED:
        return 'yellow'
      default:
        return 'gray'
    }
  }, [status])

  const expiryText = useMemo(
    () =>
      validTo && !isFulfilled
        ? translate('limitOrder.expires', {
            time: formatDistanceToNow(validTo * 1000, {
              addSuffix: true,
            }),
          })
        : undefined,
    [isFulfilled, validTo, translate],
  )

  const warningText = useMemo(() => {
    if (status !== OrderStatus.OPEN) return

    const translationProps = {
      symbol: sellAsset?.symbol ?? '',
      chainName: assertGetChainAdapter(sellAsset?.chainId ?? '')?.getDisplayName() ?? '',
    }

    if (!hasSufficientBalance) {
      return translate('limitOrder.orderCard.warning.insufficientBalance', translationProps)
    }

    if (!hasSufficientAllowance) {
      return translate('limitOrder.orderCard.warning.insufficientAllowance', translationProps)
    }
  }, [
    hasSufficientAllowance,
    hasSufficientBalance,
    sellAsset?.chainId,
    sellAsset?.symbol,
    status,
    translate,
  ])

  if (!buyAsset || !sellAsset) return null

  return (
    <Tr>
      <Td>
        <Flex alignItems='center' gap={3}>
          <AssetIconWithBadge size='sm' assetId={buyAssetId} secondaryAssetId={sellAssetId}>
            <Center borderRadius='full' boxSize='100%' bg='purple.500'>
              <ChainIcon chainId={sellAsset.chainId} boxSize='100%' />
            </Center>
          </AssetIconWithBadge>
          <Flex direction='column' minW={0}>
            <TooltipWithTouch placement='top' label={sellAmountCryptoFormatted}>
              <Amount.Crypto
                value={sellAmountCryptoPrecision}
                symbol={sellAsset.symbol}
                color='text.subtle'
                fontSize={fontSize}
                maximumFractionDigits={sellAmountPrecision}
                {...truncateProps}
              />
            </TooltipWithTouch>
            <TooltipWithTouch placement='top' label={buyAmountCryptoFormatted}>
              <Amount.Crypto
                value={buyAmountCryptoPrecision}
                symbol={buyAsset.symbol}
                fontSize={fontSize}
                maximumFractionDigits={buyAmountPrecision}
                {...truncateProps}
              />
            </TooltipWithTouch>
          </Flex>
        </Flex>
      </Td>

      <Td>
        <Flex direction='column' minW={0}>
          <TooltipWithTouch
            placement='top'
            label={
              isFulfilled
                ? translate('limitOrder.limitPriceValue', { price: limitPriceCryptoFormatted })
                : limitPriceCryptoFormatted
            }
          >
            <Amount.Crypto
              value={displayPrice}
              symbol={buyAsset.symbol}
              fontSize={fontSize}
              maximumFractionDigits={displayPricePrecision}
              {...truncateProps}
            />
          </TooltipWithTouch>
          <RawText color='text.subtle' fontSize={fontSize} {...truncateProps}>
            {translate('limitOrder.perAsset', { symbol: sellAsset.symbol })}
          </RawText>
        </Flex>
      </Td>

      <Td>
        <Flex alignItems='center' gap={2}>
          {filledDecimalPercentage > 0 && filledDecimalPercentage !== 1 ? (
            <Flex flexDirection='column' align='flex-start' gap={1} flex='0 1 60px' minW={0}>
              <RawText fontSize='xs'>{`${(filledDecimalPercentage * 100).toFixed(0)}%`}</RawText>
              <Progress
                value={filledDecimalPercentage * 100}
                width='full'
                size='sm'
                borderRadius='full'
                colorScheme={barColorScheme}
              />
            </Flex>
          ) : (
            <TooltipWithTouch label={status === OrderStatus.OPEN ? expiryText : undefined}>
              <Tag size='sm' colorScheme={tagColorScheme} variant='subtle'>
                <Flex direction='row' alignItems='center' justifyContent='center' gap={1}>
                  <Text>{translate(`limitOrder.status.${status}`)}</Text>
                  {isFulfilled && explorerTxLink && maybeExternalLink}
                </Flex>
              </Tag>
            </TooltipWithTouch>
          )}
          {warningText && (
            <TooltipWithTouch label={warningText}>
              <WarningTwoIcon color='text.warning' boxSize={4} />
            </TooltipWithTouch>
          )}
          {status === OrderStatus.OPEN && onCancelClick && (
            <IconButton
              icon={closeIcon}
              variant='ghost'
              sx={iconButtonSx}
              size='sm'
              colorScheme='gray'
              ms='auto'
              onClick={handleCancel}
              aria-label={translate('limitOrder.cancel.cancelOrder')}
            />
          )}
        </Flex>
      </Td>
    </Tr>
  )
}
