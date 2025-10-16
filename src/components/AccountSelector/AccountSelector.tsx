import type { BoxProps, ButtonProps } from '@chakra-ui/react'
import { Box, Button, Flex, HStack, Icon, Text, useDisclosure, VStack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { RiExpandUpDownLine } from 'react-icons/ri'

import { AccountSelectorDialog } from '@/components/AccountSelector/AccountSelectorDialog'
import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { isUtxoAccountId } from '@/lib/utils/utxo'
import { accountIdToLabel } from '@/state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioAccountIdsByAssetIdFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type AccountSelectorProps = {
  assetId: AssetId
  accountId?: AccountId
  onChange: (accountId: AccountId) => void
  disabled?: boolean
  autoSelectHighestBalance?: boolean
  buttonProps?: ButtonProps
  boxProps?: BoxProps
}

const chevronIconSx = {
  svg: { h: '18px', w: '18px' },
}

export const AccountSelector: FC<AccountSelectorProps> = memo(
  ({
    assetId,
    accountId: selectedAccountId,
    onChange,
    disabled,
    autoSelectHighestBalance,
    buttonProps,
    boxProps,
  }) => {
    const { isOpen, onOpen, onClose } = useDisclosure()
    const {
      number: { localeParts },
    } = useLocaleFormatter()

    const filter = useMemo(() => ({ assetId }), [assetId])
    const accountIds = useAppSelector(state =>
      selectPortfolioAccountIdsByAssetIdFilter(state, filter),
    )
    const asset = useAppSelector(state => selectAssetById(state, assetId))
    const accountBalances = useAppSelector(selectPortfolioAccountBalancesBaseUnit)
    const marketData = useAppSelector(state =>
      selectMarketDataByAssetIdUserCurrency(state, assetId),
    )

    const marketDataPrice = useMemo(() => marketData?.price ?? 0, [marketData])

    useEffect(() => {
      if (!selectedAccountId) {
        onChange(accountIds[0])
      }
    }, [selectedAccountId, accountIds, onChange])

    const selectedAccountDetails = useMemo(() => {
      if (!selectedAccountId || !asset) return null

      const cryptoBalance = fromBaseUnit(
        accountBalances?.[selectedAccountId]?.[assetId] ?? 0,
        asset.precision ?? 0,
      )
      const fiatBalance = bnOrZero(cryptoBalance).times(marketDataPrice)

      return {
        cryptoBalance,
        fiatBalance,
        label: isUtxoAccountId(selectedAccountId) ? accountIdToLabel(selectedAccountId) : undefined,
      }
    }, [selectedAccountId, asset, accountBalances, assetId, marketDataPrice])

    const handleAccountSelect = useCallback(
      (accountId: AccountId) => {
        onChange(accountId)
        onClose()
      },
      [onChange, onClose],
    )

    const isButtonDisabled = disabled || accountIds.length <= 1

    const rightIcon = useMemo(
      () => (isButtonDisabled ? null : <Icon as={RiExpandUpDownLine} color='text.subtle' />),
      [isButtonDisabled],
    )

    if (!asset) return null
    if (!accountIds.length) return null
    if (!selectedAccountId) return null

    return (
      <>
        <Box px={2} my={2} {...boxProps}>
          <Button
            onClick={onOpen}
            isDisabled={isButtonDisabled}
            variant='ghost'
            size='lg'
            width='full'
            justifyContent='space-between'
            p={4}
            borderRadius='xl'
            color='text.primary'
            {...buttonProps}
          >
            <HStack spacing={3} flex={1}>
              <AssetIcon assetId={assetId} size='sm' borderRadius='full' />
              <VStack align='start' spacing={0} flex={1}>
                <Text fontSize='md' fontWeight='bold'>
                  {selectedAccountDetails?.label ?? (
                    <MiddleEllipsis value={fromAccountId(selectedAccountId).account} />
                  )}
                </Text>
                {selectedAccountDetails && (
                  <Flex alignItems='center' gap={1}>
                    <Amount.Crypto
                      value={selectedAccountDetails.cryptoBalance}
                      symbol={asset.symbol}
                      fontSize='sm'
                      color='text.subtle'
                      fontWeight='normal'
                      maximumFractionDigits={8}
                      noSpace
                    />
                    <Amount.Fiat
                      value={selectedAccountDetails.fiatBalance.toFixed(localeParts.fraction)}
                      fontSize='sm'
                      color='text.subtle'
                      fontWeight='normal'
                      prefix='('
                      suffix=')'
                      noSpace
                      textTransform='lowercase'
                    />
                  </Flex>
                )}
              </VStack>
              <Box sx={chevronIconSx} fontSize='xs'>
                {rightIcon}
              </Box>
            </HStack>
          </Button>
        </Box>

        <AccountSelectorDialog
          isOpen={isOpen}
          onClose={onClose}
          accountIds={accountIds}
          assetId={assetId}
          asset={asset}
          autoSelectHighestBalance={autoSelectHighestBalance}
          selectedAccountId={selectedAccountId}
          onAccountSelect={handleAccountSelect}
          disabled={disabled}
        />
      </>
    )
  },
)
