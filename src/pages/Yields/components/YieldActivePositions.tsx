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
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { resolveYieldInputAssetIcon, toUserCurrency } from '@/lib/yieldxyz/utils'
import type { YieldBalanceAggregate } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { selectAssetById, selectUserCurrencyToUsdRate } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type YieldActivePositionsProps = {
  aggregated: Record<string, YieldBalanceAggregate>
  yields: AugmentedYieldDto[]
  assetId: AssetId
}

export const YieldActivePositions = memo(
  ({ aggregated, yields, assetId }: YieldActivePositionsProps) => {
    const translate = useTranslate()
    const navigate = useNavigate()
    const asset = useAppSelector(state => selectAssetById(state, assetId))
    const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)

    const { data: providers } = useYieldProviders()

    const getProviderLogo = useCallback(
      (providerId: string) => providers?.[providerId]?.logoURI,
      [providers],
    )

    const activeYields = useMemo(
      () => yields.filter(y => aggregated[y.id] && bnOrZero(aggregated[y.id].totalUsd).gt(0)),
      [yields, aggregated],
    )

    const handleRowClick = useCallback(
      (yieldId: string, validatorAddress?: string) => {
        const url = validatorAddress
          ? `/yields/${yieldId}?validator=${validatorAddress}`
          : `/yields/${yieldId}`
        navigate(url)
      },
      [navigate],
    )

    const hasValidators = useMemo(
      () => activeYields.some(y => aggregated[y.id]?.hasValidators),
      [activeYields, aggregated],
    )

    const assetColumnHeader = useMemo(() => translate('yieldXYZ.asset') ?? 'Asset', [translate])

    const providerColumnHeader = useMemo(
      () =>
        hasValidators
          ? translate('yieldXYZ.validator') ?? 'Validator'
          : translate('yieldXYZ.provider') ?? 'Provider',
      [hasValidators, translate],
    )

    const apyColumnHeader = useMemo(() => translate('yieldXYZ.apy') ?? 'APY', [translate])

    const tvlColumnHeader = useMemo(() => translate('yieldXYZ.tvl') ?? 'TVL', [translate])

    const balanceColumnHeader = useMemo(
      () => translate('yieldXYZ.balance') ?? 'Balance',
      [translate],
    )

    const yourBalanceLabel = useMemo(() => translate('defi.yourBalance'), [translate])

    const renderAssetIcon = useCallback((yieldItem: AugmentedYieldDto) => {
      const iconSource = resolveYieldInputAssetIcon(yieldItem)
      if (iconSource.assetId) return <AssetIcon assetId={iconSource.assetId} size='sm' />
      return <AssetIcon src={iconSource.src} size='sm' />
    }, [])

    const tableRows = useMemo(() => {
      if (!asset) return null

      return activeYields.flatMap(yieldItem => {
        const yieldAggregate = aggregated[yieldItem.id]
        if (!yieldAggregate) return []

        const apy = bnOrZero(yieldItem.rewardRate.total).times(100).toNumber()
        const { byValidator, hasValidators, totalUsd, totalCrypto } = yieldAggregate

        if (hasValidators) {
          return Object.values(byValidator).map(
            ({ validator, totalUsd: validatorUsd, totalCrypto: validatorCrypto }) => {
              const totalUserCurrency = toUserCurrency(validatorUsd, userCurrencyToUsdRate)

              return (
                <Tr
                  key={`${yieldItem.id}-${validator.address}`}
                  _hover={{ bg: 'background.surface.raised.base', cursor: 'pointer' }}
                  onClick={() => handleRowClick(yieldItem.id, validator.address)}
                >
                  <Td>
                    <HStack spacing={3}>
                      {renderAssetIcon(yieldItem)}
                      <Text fontWeight='bold' fontSize='sm'>
                        {yieldItem.metadata.name}
                      </Text>
                    </HStack>
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      {validator.logoURI ? (
                        <Avatar src={validator.logoURI} size='xs' name={validator.name} />
                      ) : (
                        <Avatar
                          size='xs'
                          src={getProviderLogo(yieldItem.providerId)}
                          name={yieldItem.providerId}
                        />
                      )}
                      <Text fontSize='sm' textTransform='capitalize'>
                        {validator.name || yieldItem.providerId}
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
                      <Amount.Fiat value={totalUserCurrency} fontWeight='bold' color='green.400' />
                      <Amount.Crypto
                        value={validatorCrypto}
                        symbol={asset.symbol}
                        color='text.subtle'
                        fontSize='xs'
                      />
                    </Box>
                  </Td>
                </Tr>
              )
            },
          )
        }

        const totalUserCurrency = toUserCurrency(totalUsd, userCurrencyToUsdRate)
        const tvlUsd = yieldItem.statistics?.tvlUsd
        const tvlUserCurrency = toUserCurrency(tvlUsd, userCurrencyToUsdRate)

        return (
          <Tr
            key={yieldItem.id}
            _hover={{ bg: 'background.surface.raised.base', cursor: 'pointer' }}
            onClick={() => handleRowClick(yieldItem.id)}
          >
            <Td>
              <HStack spacing={3}>
                {renderAssetIcon(yieldItem)}
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
                <Amount.Fiat value={totalUserCurrency} fontWeight='bold' color='green.400' />
                <Amount.Crypto
                  value={totalCrypto}
                  symbol={asset.symbol}
                  color='text.subtle'
                  fontSize='xs'
                />
              </Box>
            </Td>
          </Tr>
        )
      })
    }, [
      activeYields,
      aggregated,
      asset,
      getProviderLogo,
      handleRowClick,
      renderAssetIcon,
      userCurrencyToUsdRate,
    ])

    if (!asset) return null
    if (activeYields.length === 0) return null

    return (
      <Box>
        <Text fontSize='sm' color='text.subtle' fontWeight='medium' mb={2}>
          {yourBalanceLabel}
        </Text>
        <TableContainer borderWidth='1px' borderColor='border.base' borderRadius='xl'>
          <Table variant='simple'>
            <Thead bg='background.surface.raised.base'>
              <Tr>
                <Th>{assetColumnHeader}</Th>
                <Th>{providerColumnHeader}</Th>
                <Th isNumeric>{apyColumnHeader}</Th>
                <Th isNumeric>{tvlColumnHeader}</Th>
                <Th isNumeric>{balanceColumnHeader}</Th>
              </Tr>
            </Thead>
            <Tbody>{tableRows}</Tbody>
          </Table>
        </TableContainer>
      </Box>
    )
  },
)
