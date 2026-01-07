import { ArrowBackIcon } from '@chakra-ui/icons'
import { Box, Button, Container, Flex, Heading, SimpleGrid, Text } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate, useParams } from 'react-router-dom'

import { AssetIcon } from '@/components/AssetIcon'
import { YieldCard, YieldCardSkeleton } from '@/pages/Yields/components/YieldCard'
import { useYields } from '@/react-queries/queries/yieldxyz/useYields'

export const YieldAssetDetails = () => {
  const { assetId: assetSymbol } = useParams<{ assetId: string }>()
  const decodedSymbol = decodeURIComponent(assetSymbol || '')
  const navigate = useNavigate()
  const translate = useTranslate()

  const { data: yields, isLoading } = useYields()

  const filteredYields = useMemo(() => {
    if (!yields || !decodedSymbol) return []
    return yields.filter(y => {
      const token = y.inputTokens?.[0] || y.token
      return token.symbol === decodedSymbol
    })
  }, [yields, decodedSymbol])

  const assetInfo = useMemo(() => {
    if (!filteredYields[0]) return null
    return filteredYields[0].inputTokens?.[0] || filteredYields[0].token
  }, [filteredYields])

  return (
    <Container maxW='1200px' py={8}>
      <Button
        leftIcon={<ArrowBackIcon />}
        variant='ghost'
        onClick={() => navigate('/yields')}
        mb={6}
      >
        {translate('common.back')}
      </Button>

      {assetInfo && (
        <Flex alignItems='center' gap={4} mb={8}>
          <AssetIcon src={assetInfo.logoURI} size='lg' />
          <Box>
            <Heading size='lg'>{assetInfo.symbol} Yields</Heading>
            <Text color='text.subtle'>{filteredYields.length} opportunities available</Text>
          </Box>
        </Flex>
      )}

      {isLoading ? (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {Array.from({ length: 6 }).map((_, i) => (
            <YieldCardSkeleton key={i} />
          ))}
        </SimpleGrid>
      ) : filteredYields.length === 0 ? (
        <Text>No yields found for this asset.</Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {filteredYields.map(y => (
            <YieldCard
              key={y.id}
              yield={y}
              onEnter={() => navigate(`/yields/${y.id}`)}
              // Provider icon lookup needed? Or YieldCard handles it?
              // YieldCard takes providerIcon prop.
              providerIcon={undefined} // TODO: pass provider icon if needed
            />
          ))}
        </SimpleGrid>
      )}
    </Container>
  )
}
