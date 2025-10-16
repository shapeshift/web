import { CloseIcon, ExternalLinkIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { Center, Flex, IconButton, Link, Progress, Tag, Td, Text, Tr } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { assertGetCowNetwork, COW_SWAP_VAULT_RELAYER_ADDRESS } from '@shapeshiftoss/swapper'
import type { Trade } from '@shapeshiftoss/types'
import { OrderStatus } from '@shapeshiftoss/types'
import { bn, bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'
import { skipToken, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { formatDistanceToNow } from 'date-fns'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { ChainIcon } from '@/components/ChainMenu'
import { HoverTooltip } from '@/components/HoverTooltip/HoverTooltip'
import { RawText } from '@/components/Text'
import { getConfig } from '@/config'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { assertGetChainAdapter } from '@/lib/utils'
import { useAllowance } from '@/react-queries/hooks/useAllowance'
import {
  selectAssetById,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from '@/state/slices/selectors'
import { useSelectorWithArgs } from '@/state/store'

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

  const { data: tradeTxLink } = useQuery({
    queryKey: ['cowTrade', uid],
    queryFn:
      status === OrderStatus.FULFILLED && explorerTxLink
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

  const sellAssetBalanceCryptoBaseUnit = useSelectorWithArgs(
    selectPortfolioCryptoBalanceBaseUnitByFilter,
    filter,
  )

  const hasSufficientBalance = useMemo(() => {
    return bnOrZero(sellAssetBalanceCryptoBaseUnit).gte(sellAmountCryptoBaseUnit)
  }, [sellAmountCryptoBaseUnit, sellAssetBalanceCryptoBaseUnit])

  const from = useMemo(() => {
    return fromAccountId(accountId).account
  }, [accountId])

  const { data: allowanceOnChainCryptoBaseUnit } = useAllowance({
    assetId: sellAssetId,
    spender: COW_SWAP_VAULT_RELAYER_ADDRESS,
    from,
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
    () => fromBaseUnit(sellAmountCryptoBaseUnit, sellAsset?.precision ?? 0),
    [sellAmountCryptoBaseUnit, sellAsset?.precision],
  )

  const buyAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(buyAmountCryptoBaseUnit, buyAsset?.precision ?? 0),
    [buyAmountCryptoBaseUnit, buyAsset?.precision],
  )

  const sellAmountCryptoFormatted = useMemo(
    () => toCrypto(sellAmountCryptoPrecision, sellAsset?.symbol ?? ''),
    [sellAmountCryptoPrecision, toCrypto, sellAsset],
  )

  const buyAmountCryptoFormatted = useMemo(
    () => toCrypto(buyAmountCryptoPrecision, buyAsset?.symbol ?? ''),
    [buyAmountCryptoPrecision, toCrypto, buyAsset],
  )

  const executedBuyAmountCryptoPrecision = useMemo(
    () =>
      executedBuyAmountCryptoBaseUnit
        ? fromBaseUnit(executedBuyAmountCryptoBaseUnit, buyAsset?.precision ?? 0)
        : '0',
    [executedBuyAmountCryptoBaseUnit, buyAsset?.precision],
  )

  const executedSellAmountCryptoPrecision = useMemo(
    () =>
      executedSellAmountCryptoBaseUnit
        ? fromBaseUnit(executedSellAmountCryptoBaseUnit, sellAsset?.precision ?? 0)
        : '0',
    [executedSellAmountCryptoBaseUnit, sellAsset?.precision],
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

  const executionPriceCryptoFormatted = useMemo(
    () => toCrypto(executionPrice, buyAsset?.symbol ?? ''),
    [executionPrice, toCrypto, buyAsset],
  )

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
      validTo !== undefined && status !== OrderStatus.FULFILLED
        ? translate('limitOrder.expires', {
            time: formatDistanceToNow(validTo * 1000, {
              addSuffix: true,
            }),
          })
        : undefined,
    [status, validTo, translate],
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
        <Flex alignItems='center' gap={4}>
          <AssetIconWithBadge size='sm' assetId={buyAssetId} secondaryAssetId={sellAssetId}>
            <Center borderRadius='full' boxSize='100%' bg='purple.500'>
              <ChainIcon chainId={sellAsset.chainId} boxSize='100%' />
            </Center>
          </AssetIconWithBadge>
          <Flex direction='column'>
            <HoverTooltip placement='top' label={sellAmountCryptoFormatted}>
              <Amount.Crypto
                value={sellAmountCryptoPrecision}
                symbol={sellAsset.symbol}
                fontSize={fontSize}
                maximumFractionDigits={6}
              />
            </HoverTooltip>
            <HoverTooltip placement='top' label={buyAmountCryptoFormatted}>
              <Amount.Crypto
                value={buyAmountCryptoPrecision}
                symbol={buyAsset.symbol}
                fontSize={fontSize}
                maximumFractionDigits={6}
              />
            </HoverTooltip>
          </Flex>
        </Flex>
      </Td>

      <Td>
        <Flex direction='column' gap={1}>
          <HoverTooltip placement='top' label={limitPriceCryptoFormatted}>
            <Amount.Crypto
              value={limitPrice}
              symbol={buyAsset.symbol}
              color={status === OrderStatus.FULFILLED ? 'text.subtle' : 'text.base'}
              fontSize={fontSize}
              maximumFractionDigits={6}
            />
          </HoverTooltip>
          {status === OrderStatus.FULFILLED && (
            <HoverTooltip placement='top' label={executionPriceCryptoFormatted}>
              <Amount.Crypto
                value={executionPrice}
                symbol={buyAsset.symbol}
                fontSize={fontSize}
                color='text.base'
                maximumFractionDigits={6}
              />
            </HoverTooltip>
          )}
        </Flex>
      </Td>

      <Td>
        <Flex alignItems='center' gap={2}>
          {filledDecimalPercentage > 0 && filledDecimalPercentage !== 1 ? (
            <Flex flexDirection='column' align='flex-start' gap={1}>
              <RawText fontSize='xs'>{`${(filledDecimalPercentage * 100).toFixed(0)}%`}</RawText>
              <Progress
                value={filledDecimalPercentage * 100}
                width='60px'
                size='sm'
                borderRadius='full'
                colorScheme={barColorScheme}
              />
            </Flex>
          ) : (
            <HoverTooltip label={expiryText} isDisabled={status !== OrderStatus.OPEN}>
              <Tag size='sm' colorScheme={tagColorScheme} variant='subtle'>
                <Flex direction='row' alignItems='center' justifyContent='center' gap={1}>
                  <Text>{translate(`limitOrder.status.${status}`)}</Text>
                  {status === OrderStatus.FULFILLED && explorerTxLink && maybeExternalLink}
                </Flex>
              </Tag>
            </HoverTooltip>
          )}
          {warningText && (
            <HoverTooltip label={warningText}>
              <WarningTwoIcon color='yellow.500' boxSize={4} />
            </HoverTooltip>
          )}
        </Flex>
      </Td>

      {status === OrderStatus.OPEN && (
        <Td isNumeric>
          <IconButton
            icon={closeIcon}
            variant='ghost'
            sx={iconButtonSx}
            size='sm'
            colorScheme='gray'
            onClick={handleCancel}
            aria-label='Cancel order'
          />
        </Td>
      )}
    </Tr>
  )
}
