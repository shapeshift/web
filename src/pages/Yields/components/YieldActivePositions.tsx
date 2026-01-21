import {
  Avatar,
  Box,
  HStack,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { Display } from '@/components/Display'
import { RawText } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import type { AugmentedYieldBalanceWithAccountId } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectUserCurrencyToUsdRate,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type AccountBalanceInfo = {
  totalUsd: string
  totalCrypto: string
  validatorAddress?: string
  validatorName?: string
  validatorLogo?: string
}

type AccountYieldPosition = {
  accountId: AccountId
  accountLabel: string
  yieldItem: AugmentedYieldDto
  providerId: string
  providerLogo: string | undefined
  apy: number
  totalUsd: string
  totalCrypto: string
  validatorAddress?: string
  validatorName?: string
  validatorLogo?: string
}

type YieldActivePositionsProps = {
  balancesByYieldId: Record<string, AugmentedYieldBalanceWithAccountId[]> | undefined
  yields: AugmentedYieldDto[]
  assetId: AssetId
}

type HandlePositionClickArgs = {
  yieldId: string
  accountId: AccountId
  validatorAddress?: string
}

const hoverSx = { bg: 'background.surface.raised.base', cursor: 'pointer' }

export const YieldActivePositions = memo(
  ({ balancesByYieldId, yields, assetId }: YieldActivePositionsProps) => {
    const translate = useTranslate()
    const navigate = useNavigate()
    const asset = useAppSelector(state => selectAssetById(state, assetId))
    const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)

    const { data: providers } = useYieldProviders()

    const getProviderLogo = useCallback(
      (providerId: string) => providers?.[providerId]?.logoURI,
      [providers],
    )

    const getProviderName = useCallback(
      (providerId: string) => providers?.[providerId]?.name ?? providerId,
      [providers],
    )

    const uniqueAccountIds = useMemo((): AccountId[] => {
      if (!balancesByYieldId) return []
      const accountIdSet = new Set<AccountId>()
      for (const balances of Object.values(balancesByYieldId)) {
        for (const balance of balances) {
          if (balance.accountId) accountIdSet.add(balance.accountId)
        }
      }
      return Array.from(accountIdSet)
    }, [balancesByYieldId])

    const accountNumberByAccountId = useAppSelector(state => {
      const mapping: Record<AccountId, number | undefined> = {}
      for (const accountId of uniqueAccountIds) {
        mapping[accountId] = selectAccountNumberByAccountId(state, { accountId })
      }
      return mapping
    })

    const getAccountLabel = useCallback(
      (accountId: AccountId) => {
        const accountNumber = accountNumberByAccountId[accountId]
        return accountNumber !== undefined
          ? translate('accounts.accountNumber', { accountNumber })
          : translate('accounts.account')
      },
      [accountNumberByAccountId, translate],
    )

    const accountPositions = useMemo((): AccountYieldPosition[] => {
      if (!balancesByYieldId || !asset) return []

      const positions: AccountYieldPosition[] = []
      const yieldsMap = new Map(yields.map(y => [y.id, y]))

      for (const [yieldId, balances] of Object.entries(balancesByYieldId)) {
        const yieldItem = yieldsMap.get(yieldId)
        if (!yieldItem) continue

        const accountBalances = new Map<AccountId, AccountBalanceInfo>()

        for (const balance of balances) {
          const { accountId, amountUsd, amount, validator } = balance
          if (!accountId || bnOrZero(amount).lte(0)) continue

          const existing = accountBalances.get(accountId)
          if (existing) {
            accountBalances.set(accountId, {
              totalUsd: bnOrZero(existing.totalUsd).plus(amountUsd).toFixed(),
              totalCrypto: bnOrZero(existing.totalCrypto).plus(amount).toFixed(),
              validatorAddress: existing.validatorAddress ?? validator?.address,
              validatorName: existing.validatorName ?? validator?.name,
              validatorLogo: existing.validatorLogo ?? validator?.logoURI,
            })
          } else {
            accountBalances.set(accountId, {
              totalUsd: amountUsd,
              totalCrypto: amount,
              validatorAddress: validator?.address,
              validatorName: validator?.name,
              validatorLogo: validator?.logoURI,
            })
          }
        }

        for (const [accountId, balanceInfo] of accountBalances) {
          positions.push({
            accountId,
            accountLabel: getAccountLabel(accountId),
            yieldItem,
            providerId: yieldItem.providerId,
            providerLogo: getProviderLogo(yieldItem.providerId),
            apy: bnOrZero(yieldItem.rewardRate.total).times(100).toNumber(),
            totalUsd: balanceInfo.totalUsd,
            totalCrypto: balanceInfo.totalCrypto,
            validatorAddress: balanceInfo.validatorAddress,
            validatorName: balanceInfo.validatorName,
            validatorLogo: balanceInfo.validatorLogo,
          })
        }
      }

      return positions.sort((a, b) => bnOrZero(b.totalUsd).minus(a.totalUsd).toNumber())
    }, [balancesByYieldId, yields, asset, getProviderLogo, getAccountLabel])

    const handlePositionClick = useCallback(
      ({ yieldId, accountId, validatorAddress }: HandlePositionClickArgs) => {
        const params = new URLSearchParams()
        params.set('accountId', accountId)
        if (validatorAddress) params.set('validator', validatorAddress)
        navigate(`/yields/${yieldId}?${params.toString()}`)
      },
      [navigate],
    )

    const tableRows = useMemo(() => {
      if (!asset) return null

      return accountPositions.map(position => {
        const totalUserCurrency = bnOrZero(position.totalUsd).times(userCurrencyToUsdRate).toFixed()
        const displayName = position.validatorName ?? getProviderName(position.providerId)
        const displayLogo = position.validatorLogo ?? position.providerLogo

        return (
          <Tr
            key={`${position.yieldItem.id}-${position.accountId}`}
            _hover={hoverSx}
            onClick={() =>
              handlePositionClick({
                yieldId: position.yieldItem.id,
                accountId: position.accountId,
                validatorAddress: position.validatorAddress,
              })
            }
          >
            <Td>
              <HStack spacing={2}>
                <Avatar
                  size='xs'
                  src={displayLogo}
                  name={displayName}
                  bg='background.surface.raised.base'
                />
                <Box>
                  <Text fontSize='sm' textTransform='capitalize' fontWeight='medium'>
                    {displayName}
                  </Text>
                  <RawText fontSize='xs' color='text.subtle' fontFamily='monospace'>
                    {position.accountLabel}
                  </RawText>
                </Box>
              </HStack>
            </Td>
            <Td isNumeric>
              <Text
                fontWeight='bold'
                fontSize='md'
                bgGradient='linear(to-r, green.300, blue.400)'
                bgClip='text'
              >
                {position.apy.toFixed(2)}%
              </Text>
            </Td>
            <Td isNumeric>
              <Box textAlign='right'>
                <Amount.Fiat value={totalUserCurrency} fontWeight='bold' color='green.400' />
                <Amount.Crypto
                  value={position.totalCrypto}
                  symbol={asset.symbol}
                  color='text.subtle'
                  fontSize='xs'
                />
              </Box>
            </Td>
          </Tr>
        )
      })
    }, [accountPositions, asset, getProviderName, handlePositionClick, userCurrencyToUsdRate])

    const mobileRows = useMemo(() => {
      if (!asset) return []

      return accountPositions.map(position => {
        const totalUserCurrency = bnOrZero(position.totalUsd).times(userCurrencyToUsdRate).toFixed()
        const displayName = position.validatorName ?? getProviderName(position.providerId)
        const displayLogo = position.validatorLogo ?? position.providerLogo

        return (
          <Box
            key={`${position.yieldItem.id}-${position.accountId}-mobile`}
            borderWidth='1px'
            borderColor='border.base'
            borderRadius='xl'
            p={4}
            bg='background.surface.raised.base'
            onClick={() =>
              handlePositionClick({
                yieldId: position.yieldItem.id,
                accountId: position.accountId,
                validatorAddress: position.validatorAddress,
              })
            }
          >
            <HStack justifyContent='space-between' alignItems='center' mb={2} spacing={3}>
              <HStack spacing={2} alignItems='center'>
                <Avatar
                  size='sm'
                  src={displayLogo}
                  name={displayName}
                  bg='background.surface.raised.base'
                />
                <Box>
                  <Text fontWeight='semibold' fontSize='sm'>
                    {displayName}
                  </Text>
                  <RawText fontSize='xs' color='text.subtle' fontFamily='monospace'>
                    {position.accountLabel}
                  </RawText>
                </Box>
              </HStack>
              <Text
                fontWeight='bold'
                fontSize='md'
                bgGradient='linear(to-r, green.300, blue.400)'
                bgClip='text'
              >
                {position.apy.toFixed(2)}%
              </Text>
            </HStack>
            <Box textAlign='right'>
              <Amount.Fiat value={totalUserCurrency} fontWeight='bold' color='green.400' />
              <Amount.Crypto
                value={position.totalCrypto}
                symbol={asset.symbol}
                color='text.subtle'
                fontSize='xs'
              />
            </Box>
          </Box>
        )
      })
    }, [accountPositions, asset, getProviderName, handlePositionClick, userCurrencyToUsdRate])

    if (!asset) return null
    if (accountPositions.length === 0) return null

    return (
      <>
        <Display.Desktop>
          <TableContainer borderWidth='1px' borderColor='border.base' borderRadius='xl'>
            <Table variant='simple' size='sm'>
              <Thead bg='background.surface.raised.base'>
                <Tr>
                  <Th>{translate('yieldXYZ.provider')}</Th>
                  <Th isNumeric>{translate('yieldXYZ.apy')}</Th>
                  <Th isNumeric>{translate('yieldXYZ.balance')}</Th>
                </Tr>
              </Thead>
              <Tbody>{tableRows}</Tbody>
            </Table>
          </TableContainer>
        </Display.Desktop>
        <Display.Mobile>
          <Stack spacing={3}>{mobileRows}</Stack>
        </Display.Mobile>
      </>
    )
  },
)
