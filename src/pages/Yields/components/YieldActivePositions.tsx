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
import { toUserCurrency } from '@/lib/yieldxyz/utils'
import type { AugmentedYieldBalanceWithAccountId } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { accountIdToLabel } from '@/state/slices/portfolioSlice/utils'
import { selectAssetById, selectUserCurrencyToUsdRate } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

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
}

type YieldActivePositionsProps = {
  balancesByYieldId: Record<string, AugmentedYieldBalanceWithAccountId[]> | undefined
  yields: AugmentedYieldDto[]
  assetId: AssetId
}

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

    const accountPositions = useMemo((): AccountYieldPosition[] => {
      if (!balancesByYieldId || !asset) return []

      const positions: AccountYieldPosition[] = []
      const yieldsMap = new Map(yields.map(y => [y.id, y]))

      for (const [yieldId, balances] of Object.entries(balancesByYieldId)) {
        const yieldItem = yieldsMap.get(yieldId)
        if (!yieldItem) continue

        const accountBalances = new Map<
          AccountId,
          { totalUsd: string; totalCrypto: string; validatorAddress?: string }
        >()

        for (const balance of balances) {
          const { accountId, amountUsd, amount, validator } = balance
          if (!accountId || bnOrZero(amount).lte(0)) continue

          const existing = accountBalances.get(accountId)
          if (existing) {
            accountBalances.set(accountId, {
              totalUsd: bnOrZero(existing.totalUsd).plus(amountUsd).toFixed(),
              totalCrypto: bnOrZero(existing.totalCrypto).plus(amount).toFixed(),
              validatorAddress: existing.validatorAddress ?? validator?.address,
            })
          } else {
            accountBalances.set(accountId, {
              totalUsd: amountUsd,
              totalCrypto: amount,
              validatorAddress: validator?.address,
            })
          }
        }

        for (const [accountId, { totalUsd, totalCrypto, validatorAddress }] of accountBalances) {
          positions.push({
            accountId,
            accountLabel: accountIdToLabel(accountId),
            yieldItem,
            providerId: yieldItem.providerId,
            providerLogo: getProviderLogo(yieldItem.providerId),
            apy: bnOrZero(yieldItem.rewardRate.total).times(100).toNumber(),
            totalUsd,
            totalCrypto,
            validatorAddress,
          })
        }
      }

      return positions.sort((a, b) => bnOrZero(b.totalUsd).minus(a.totalUsd).toNumber())
    }, [balancesByYieldId, yields, asset, getProviderLogo])

    const handleRowClick = useCallback(
      (yieldId: string, validatorAddress?: string) => {
        const url = validatorAddress
          ? `/yields/${yieldId}?validator=${validatorAddress}`
          : `/yields/${yieldId}`
        navigate(url)
      },
      [navigate],
    )

    const providerColumnHeader = useMemo(
      () => translate('yieldXYZ.provider') ?? 'Provider',
      [translate],
    )
    const apyColumnHeader = useMemo(() => translate('yieldXYZ.apy') ?? 'APY', [translate])
    const balanceColumnHeader = useMemo(
      () => translate('yieldXYZ.balance') ?? 'Balance',
      [translate],
    )

    const tableRows = useMemo(() => {
      if (!asset) return null

      return accountPositions.map(position => {
        const totalUserCurrency = toUserCurrency(position.totalUsd, userCurrencyToUsdRate)

        return (
          <Tr
            key={`${position.yieldItem.id}-${position.accountId}`}
            _hover={{ bg: 'background.surface.raised.base', cursor: 'pointer' }}
            onClick={() => handleRowClick(position.yieldItem.id, position.validatorAddress)}
          >
            <Td>
              <HStack spacing={2}>
                <Avatar
                  size='xs'
                  src={position.providerLogo}
                  name={position.providerId}
                  bg='background.surface.raised.base'
                />
                <Box>
                  <Text fontSize='sm' textTransform='capitalize' fontWeight='medium'>
                    {getProviderName(position.providerId)}
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
            <Display.Desktop>
              <Td>
                <RawText
                  fontSize='sm'
                  color='text.subtle'
                  fontWeight='medium'
                  fontFamily='monospace'
                >
                  {position.accountLabel}
                </RawText>
              </Td>
            </Display.Desktop>
          </Tr>
        )
      })
    }, [accountPositions, asset, getProviderName, handleRowClick, userCurrencyToUsdRate])

    const mobileRows = useMemo(() => {
      if (!asset) return []
      return accountPositions.map(position => {
        const totalUserCurrency = toUserCurrency(position.totalUsd, userCurrencyToUsdRate)
        return (
          <Box
            key={`${position.yieldItem.id}-${position.accountId}-mobile`}
            borderWidth='1px'
            borderColor='border.base'
            borderRadius='xl'
            p={4}
            bg='background.surface.raised.base'
            onClick={() => handleRowClick(position.yieldItem.id, position.validatorAddress)}
          >
            <HStack justifyContent='space-between' alignItems='center' mb={2} spacing={3}>
              <HStack spacing={2} alignItems='center'>
                <Avatar
                  size='sm'
                  src={position.providerLogo}
                  name={position.providerId}
                  bg='background.surface.raised.base'
                />
                <Box>
                  <Text fontWeight='semibold' fontSize='sm'>
                    {getProviderName(position.providerId)}
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
    }, [accountPositions, asset, getProviderName, handleRowClick, userCurrencyToUsdRate])

    if (!asset) return null
    if (accountPositions.length === 0) return null

    return (
      <>
        <Display.Desktop>
          <TableContainer borderWidth='1px' borderColor='border.base' borderRadius='xl'>
            <Table variant='simple' size='sm'>
              <Thead bg='background.surface.raised.base'>
                <Tr>
                  <Th>{providerColumnHeader}</Th>
                  <Th isNumeric>{apyColumnHeader}</Th>
                  <Th isNumeric>{balanceColumnHeader}</Th>
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
