import {
  Avatar,
  Box,
  HStack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { resolveYieldInputAssetIcon } from '@/lib/yieldxyz/utils'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { selectAssetById, selectUserCurrencyToUsdRate } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type YieldActivePositionsProps = {
  balances: Record<string, any[]>
  yields: AugmentedYieldDto[]
  assetId: AssetId
}

export const YieldActivePositions = ({ balances, yields, assetId }: YieldActivePositionsProps) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50')
  const borderColor = useColorModeValue('gray.100', 'whiteAlpha.100')

  const { data: providers } = useYieldProviders()

  const getProviderLogo = (providerId: string) => {
    return providers?.[providerId]?.logoURI
  }

  if (!asset) return null

  // Filter yields that have balances
  const activeYields = yields.filter(y => balances[y.id] && balances[y.id].length > 0)

  if (activeYields.length === 0) return null

  const handleRowClick = (yieldId: string) => {
    navigate(`/yields/${yieldId}`)
  }

  // Check if any active position has a validator to determine column header
  const hasValidators = activeYields.some(y => {
    const yieldBalances = balances[y.id]
    return yieldBalances.some((b: any) => !!b.validator)
  })

  return (
    <Box>
      <Text fontSize='sm' color='gray.500' fontWeight='medium' mb={2}>
        {translate('defi.yourBalance')}
      </Text>
      <TableContainer
        bg='transparent'
        borderWidth='1px'
        borderColor={borderColor}
        borderRadius='xl'
      >
        <Table variant='simple'>
          <Thead bg='whiteAlpha.50'>
            <Tr>
              <Th>{translate('yieldXYZ.asset') ?? 'Asset'}</Th>
              <Th>
                {hasValidators
                  ? translate('yieldXYZ.validator') ?? 'Validator'
                  : translate('yieldXYZ.provider') ?? 'Provider'}
              </Th>
              <Th isNumeric>{translate('yieldXYZ.apy') ?? 'APY'}</Th>
              <Th isNumeric>{translate('yieldXYZ.tvl') ?? 'TVL'}</Th>
              <Th isNumeric>{translate('yieldXYZ.balance') ?? 'Balance'}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {activeYields.map(yieldItem => {
              const yieldBalances = balances[yieldItem.id]

              // Check if we have validator-specific balances
              // We group by validator address if meaningful validator info exists
              const validatorGroups: Record<string, typeof yieldBalances> = {}
              const noValidatorBalances: typeof yieldBalances = []

              yieldBalances.forEach((b: any) => {
                if (b.validator) {
                  const key = b.validator.address
                  if (!validatorGroups[key]) validatorGroups[key] = []
                  validatorGroups[key].push(b)
                } else {
                  noValidatorBalances.push(b)
                }
              })

              const rows = []

              // Render validator rows
              Object.entries(validatorGroups).forEach(([validatorAddress, groupBalances]) => {
                const validator = groupBalances[0].validator
                const totalCrypto = groupBalances.reduce(
                  (acc: any, b: any) => acc.plus(b.amount),
                  bnOrZero(0),
                )
                const totalUsd = groupBalances.reduce(
                  (acc: any, b: any) => acc.plus(b.amountUsd),
                  bnOrZero(0),
                )
                const totalUserCurrency = totalUsd.times(userCurrencyToUsdRate).toFixed()
                const apy = bnOrZero(yieldItem.rewardRate.total).times(100).toNumber()

                rows.push(
                  <Tr
                    key={`${yieldItem.id}-${validatorAddress}`}
                    _hover={{ bg: hoverBg, cursor: 'pointer' }}
                    onClick={() => handleRowClick(yieldItem.id)}
                  >
                    <Td>
                      <HStack spacing={3}>
                        {(() => {
                          const iconSource = resolveYieldInputAssetIcon(yieldItem)
                          return iconSource.assetId ? (
                            <AssetIcon assetId={iconSource.assetId} size='sm' />
                          ) : (
                            <AssetIcon src={iconSource.src} size='sm' />
                          )
                        })()}
                        <Text fontWeight='bold' fontSize='sm'>
                          {yieldItem.metadata.name}
                        </Text>
                      </HStack>
                    </Td>
                    <Td>
                      <HStack spacing={2}>
                        {validator?.logoURI ? (
                          <Avatar src={validator.logoURI} size='xs' name={validator.name} />
                        ) : (
                          <Avatar
                            size='xs'
                            src={getProviderLogo(yieldItem.providerId)}
                            name={yieldItem.providerId}
                          />
                        )}
                        <Text fontSize='sm' textTransform='capitalize'>
                          {validator?.name || yieldItem.providerId}
                        </Text>
                      </HStack>
                    </Td>
                    <Td isNumeric>
                      <Text
                        fontWeight='bold'
                        fontSize='md'
                        bgGradient='linear(to-r, green.300, blue.400)'
                        bgClip='text'
                      >
                        {apy.toFixed(2)}%
                      </Text>
                    </Td>
                    <Td isNumeric>
                      <Text fontSize='sm' color='text.subtle'>
                        -
                      </Text>
                    </Td>
                    <Td isNumeric>
                      <Box textAlign='right'>
                        <Amount.Fiat
                          value={totalUserCurrency}
                          fontWeight='bold'
                          color='green.400'
                        />
                        <Amount.Crypto
                          value={totalCrypto.toString()}
                          symbol={asset.symbol}
                          color='text.subtle'
                          fontSize='xs'
                        />
                      </Box>
                    </Td>
                  </Tr>,
                )
              })

              // Render remaining (non-validator) balances as a generic row if any exist
              // (or if there were no validators at all, this catches the standard case)
              if (noValidatorBalances.length > 0) {
                const totalCrypto = noValidatorBalances.reduce(
                  (acc: any, b: any) => acc.plus(b.amount),
                  bnOrZero(0),
                )
                const totalUsd = noValidatorBalances.reduce(
                  (acc: any, b: any) => acc.plus(b.amountUsd),
                  bnOrZero(0),
                )
                const totalUserCurrency = totalUsd.times(userCurrencyToUsdRate).toFixed()
                const apy = bnOrZero(yieldItem.rewardRate.total).times(100).toNumber()
                const tvlUsd = yieldItem.statistics?.tvlUsd
                const tvlUserCurrency = bnOrZero(tvlUsd).times(userCurrencyToUsdRate).toFixed()

                rows.push(
                  <Tr
                    key={yieldItem.id}
                    _hover={{ bg: hoverBg, cursor: 'pointer' }}
                    onClick={() => handleRowClick(yieldItem.id)}
                  >
                    <Td>
                      <HStack spacing={3}>
                        {(() => {
                          const iconSource = resolveYieldInputAssetIcon(yieldItem)
                          return iconSource.assetId ? (
                            <AssetIcon assetId={iconSource.assetId} size='sm' />
                          ) : (
                            <AssetIcon src={iconSource.src} size='sm' />
                          )
                        })()}
                        <Text fontWeight='bold' fontSize='sm'>
                          {yieldItem.metadata.name}
                        </Text>
                      </HStack>
                    </Td>
                    <Td>
                      <HStack spacing={2}>
                        <Avatar
                          size='xs'
                          src={getProviderLogo(yieldItem.providerId)}
                          name={yieldItem.providerId}
                        />
                        <Text fontSize='sm' textTransform='capitalize'>
                          {yieldItem.providerId}
                        </Text>
                      </HStack>
                    </Td>
                    <Td isNumeric>
                      <Text
                        fontWeight='bold'
                        fontSize='md'
                        bgGradient='linear(to-r, green.300, blue.400)'
                        bgClip='text'
                      >
                        {apy.toFixed(2)}%
                      </Text>
                    </Td>
                    <Td isNumeric>
                      <Text fontSize='sm' color='text.subtle'>
                        {tvlUsd ? <Amount.Fiat value={tvlUserCurrency} abbreviated /> : '-'}
                      </Text>
                    </Td>
                    <Td isNumeric>
                      <Box textAlign='right'>
                        <Amount.Fiat
                          value={totalUserCurrency}
                          fontWeight='bold'
                          color='green.400'
                        />
                        <Amount.Crypto
                          value={totalCrypto.toString()}
                          symbol={asset.symbol}
                          color='text.subtle'
                          fontSize='xs'
                        />
                      </Box>
                    </Td>
                  </Tr>,
                )
              }

              return rows
            })}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  )
}
