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
import { selectAssetById } from '@/state/slices/selectors'
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
              <Th>{translate('yieldXYZ.provider') ?? 'Provider'}</Th>
              <Th isNumeric>{translate('yieldXYZ.apy') ?? 'APY'}</Th>
              <Th isNumeric>{translate('yieldXYZ.tvl') ?? 'TVL'}</Th>
              <Th isNumeric>{translate('yieldXYZ.balance') ?? 'Balance'}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {activeYields.map(yieldItem => {
              // Sum positions for this yield (across accounts if multiple)
              const totalCrypto = balances[yieldItem.id].reduce(
                (acc: any, b: any) => acc.plus(b.amount),
                bnOrZero(0),
              )
              const totalFiat = balances[yieldItem.id].reduce(
                (acc: any, b: any) => acc.plus(b.amountUsd),
                bnOrZero(0),
              )
              const apy = bnOrZero(yieldItem.rewardRate.total).times(100).toNumber()
              const tvl = yieldItem.statistics?.tvlUsd

              return (
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
                      {tvl ? <Amount.Fiat value={tvl} abbreviated /> : '-'}
                    </Text>
                  </Td>
                  <Td isNumeric>
                    <Box textAlign='right'>
                      <Amount.Fiat
                        value={totalFiat.toString()}
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
                </Tr>
              )
            })}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  )
}
