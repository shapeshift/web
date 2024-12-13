import { WarningTwoIcon } from '@chakra-ui/icons'
import { Box, Button, Center, Flex, Progress, Tag, TagLabel, Tooltip } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { COW_SWAP_VAULT_RELAYER_ADDRESS } from '@shapeshiftoss/swapper'
import { OrderStatus } from '@shapeshiftoss/types'
import { bn, bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'
import { formatDistanceToNow } from 'date-fns'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useAllowance } from 'react-queries/hooks/useAllowance'
import { Amount } from 'components/Amount/Amount'
import { AssetIconWithBadge } from 'components/AssetIconWithBadge'
import { SwapBoldIcon } from 'components/Icons/SwapBold'
import { RawText, Text } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { assertGetChainAdapter } from 'lib/utils'
import {
  selectAssetById,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import { useSelectorWithArgs } from 'state/store'

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
}

const buttonBgHover = {
  bg: 'background.button.secondary.hover',
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
}) => {
  const translate = useTranslate()
  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const buyAsset = useSelectorWithArgs(selectAssetById, buyAssetId)
  const sellAsset = useSelectorWithArgs(selectAssetById, sellAssetId)

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

  const hasSufficientBalance = bnOrZero(sellAssetBalanceCryptoBaseUnit).gte(
    sellAmountCryptoBaseUnit,
  )

  const from = useMemo(() => {
    return fromAccountId(accountId).account
  }, [accountId])

  const { data: allowanceOnChainCryptoBaseUnit } = useAllowance({
    assetId: sellAssetId,
    spender: COW_SWAP_VAULT_RELAYER_ADDRESS,
    from,
    isDisabled: !hasSufficientBalance || status !== OrderStatus.OPEN,
  })

  const hasSufficientAllowance = useMemo(() => {
    if (!allowanceOnChainCryptoBaseUnit) return
    return bn(sellAmountCryptoBaseUnit).lte(allowanceOnChainCryptoBaseUnit)
  }, [allowanceOnChainCryptoBaseUnit, sellAmountCryptoBaseUnit])

  const handleCancel = useCallback(() => {
    onCancelClick?.(uid)
  }, [onCancelClick, uid])

  const formattedPercentage = (filledDecimalPercentage * 100).toFixed(2)

  const sellAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(sellAmountCryptoBaseUnit, sellAsset?.precision ?? 0),
    [sellAmountCryptoBaseUnit, sellAsset?.precision],
  )

  const buyAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(buyAmountCryptoBaseUnit, buyAsset?.precision ?? 0),
    [buyAmountCryptoBaseUnit, buyAsset?.precision],
  )

  const limitPrice = useMemo(() => {
    return bn(buyAmountCryptoPrecision).div(sellAmountCryptoPrecision).toFixed()
  }, [buyAmountCryptoPrecision, sellAmountCryptoPrecision])

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
      validTo && status !== OrderStatus.FULFILLED
        ? formatDistanceToNow(validTo * 1000, {
            addSuffix: true,
          })
        : undefined,
    [status, validTo],
  )

  const sellAmountCryptoFormatted = useMemo(
    () => toCrypto(sellAmountCryptoPrecision, sellAsset?.symbol ?? ''),
    [sellAmountCryptoPrecision, toCrypto, sellAsset],
  )

  const buyAmountCryptoFormatted = useMemo(
    () => toCrypto(buyAmountCryptoPrecision, buyAsset?.symbol ?? ''),
    [buyAmountCryptoPrecision, toCrypto, buyAsset],
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
    <Box
      borderRadius='2xl'
      p={4}
      width='100%'
      border='1px solid'
      borderColor='whiteAlpha.100'
      mb={4}
    >
      <Flex direction='column' gap={4}>
        {/* Asset amounts row */}
        <Flex justifyContent='space-between' alignItems='flex-start'>
          {/* Left group - icon and amounts */}
          <Flex alignItems='flex-start' gap={4} flex={1} minWidth={0}>
            <AssetIconWithBadge size='lg' assetId={buyAssetId} secondaryAssetId={sellAssetId}>
              <Center borderRadius='full' boxSize='100%' bg='purple.500'>
                <SwapBoldIcon boxSize='100%' />
              </Center>
            </AssetIconWithBadge>
            <Flex gap={2} alignItems='flex-start' width='100%' minWidth={0}>
              <Flex direction='column' align='flex-start' width='100%' minWidth={0}>
                <Tooltip label={sellAmountCryptoFormatted}>
                  <Box width='100%' overflow='hidden'>
                    <Amount.Crypto
                      value={sellAmountCryptoPrecision}
                      symbol={sellAsset.symbol}
                      color='gray.500'
                      fontSize='lg'
                      whiteSpace='nowrap'
                      overflow='hidden'
                      textOverflow='ellipsis'
                      display='block'
                    />
                  </Box>
                </Tooltip>
                <Tooltip label={buyAmountCryptoFormatted}>
                  <Box width='100%' overflow='hidden'>
                    <Amount.Crypto
                      value={buyAmountCryptoPrecision}
                      symbol={buyAsset.symbol}
                      fontSize='lg'
                      whiteSpace='nowrap'
                      overflow='hidden'
                      textOverflow='ellipsis'
                      display='block'
                    />
                  </Box>
                </Tooltip>
              </Flex>
            </Flex>
          </Flex>
          {/* Right group - status tag */}
          <Flex direction='column' gap={1} align='flex-end' minWidth={0}>
            <Tag flexShrink={0} colorScheme={tagColorScheme}>
              <TagLabel>{translate(`limitOrder.status.${status}`)}</TagLabel>
            </Tag>
            {Boolean(warningText) && (
              <Tooltip label={warningText}>
                <WarningTwoIcon color='text.warning' boxSize={6} />
              </Tooltip>
            )}
          </Flex>
        </Flex>

        {/* Price row */}
        <Flex justify='space-between' align='center'>
          <Text
            color='gray.500'
            translation={
              status === OrderStatus.FULFILLED
                ? 'limitOrder.executionPrice'
                : 'limitOrder.limitPrice'
            }
          />
          <Flex justify='flex-end'>
            <RawText mr={1}>{`1 ${sellAsset.symbol} =`}</RawText>
            <Amount.Crypto value={limitPrice} symbol={buyAsset.symbol} />
          </Flex>
        </Flex>

        {/* Expiry row */}
        {Boolean(expiryText) && (
          <Flex justify='space-between' align='center'>
            <Text color='gray.500' translation='limitOrder.expiry' />
            <RawText>{expiryText}</RawText>
          </Flex>
        )}

        {/* Filled row */}
        <Flex justify='space-between' align='center'>
          <Text color='gray.500' translation='limitOrder.status.fulfilled' />
          <Flex align='center' gap={4} width='60%'>
            <Progress
              value={filledDecimalPercentage * 100}
              width='100%'
              borderRadius='full'
              colorScheme={barColorScheme}
            />
            <RawText>{`${formattedPercentage}%`}</RawText>
          </Flex>
        </Flex>

        {/* Cancel button */}
        {status === OrderStatus.OPEN && (
          <Button
            colorScheme='red'
            width='100%'
            mt={2}
            color='red.500'
            onClick={handleCancel}
            bg='background.button.secondary.base'
            _hover={buttonBgHover}
          >
            <Text translation='common.cancel' />
          </Button>
        )}
      </Flex>
    </Box>
  )
}
