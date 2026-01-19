import { Box, Card, CardBody, Heading, VStack } from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { YieldCompareItem } from '@/pages/Yields/components/YieldCompareItem'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { useYields } from '@/react-queries/queries/yieldxyz/useYields'

type YieldRelatedMarketsProps = {
  currentYieldId: string
  tokenSymbol: string
}

export const YieldRelatedMarkets = memo(
  ({ currentYieldId, tokenSymbol }: YieldRelatedMarketsProps) => {
    const translate = useTranslate()
    const navigate = useNavigate()
    const { data: yields } = useYields()
    const { data: yieldProviders } = useYieldProviders()

    const relatedYields = useMemo(() => {
      if (!yields?.all) return []

      return yields.all
        .filter(y => {
          if (y.id === currentYieldId) return false
          const inputSymbol = y.inputTokens?.[0]?.symbol || y.token.symbol
          return inputSymbol === tokenSymbol
        })
        .sort((a, b) => b.rewardRate.total - a.rewardRate.total)
        .slice(0, 6)
    }, [yields?.all, currentYieldId, tokenSymbol])

    const handleYieldClick = useCallback(
      (yieldId: string) => {
        navigate(`/yields/${yieldId}`)
      },
      [navigate],
    )

    const getProviderInfo = useCallback(
      (providerId: string) => {
        const provider = yieldProviders?.[providerId]
        return { name: provider?.name, icon: provider?.logoURI }
      },
      [yieldProviders],
    )

    if (relatedYields.length === 0) return null

    return (
      <Box mt={6}>
        <Heading as='h3' size='md' mb={4}>
          {translate('yieldXYZ.otherYields', { symbol: tokenSymbol })}
        </Heading>
        <Card>
          <CardBody px={2} py={2}>
            <VStack spacing={0} align='stretch'>
              {relatedYields.map(y => {
                const providerInfo = getProviderInfo(y.providerId)
                return (
                  <YieldCompareItem
                    key={y.id}
                    yieldItem={y}
                    providerName={providerInfo.name}
                    providerIcon={providerInfo.icon}
                    onClick={() => handleYieldClick(y.id)}
                  />
                )
              })}
            </VStack>
          </CardBody>
        </Card>
      </Box>
    )
  },
)
