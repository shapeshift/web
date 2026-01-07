import { ArrowBackIcon } from '@chakra-ui/icons'
import { Box, Button, Container, Flex, Heading, SimpleGrid, Text } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate, useParams } from 'react-router-dom'

import { AssetIcon } from '@/components/AssetIcon'
import { YieldCard, YieldCardSkeleton } from '@/pages/Yields/components/YieldCard'
import { useYields } from '@/react-queries/queries/yieldxyz/useYields'
import { store } from '@/state/store'

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
    const token = filteredYields[0].inputTokens?.[0] || filteredYields[0].token

    // Logic: Prioritize Local Asset ID > API URI
    const assets = store.getState().assets.byId
    let resolvedAssetId: string | undefined = token.assetId
    let resolvedSrc: string | undefined = token.logoURI

    if (resolvedAssetId && assets[resolvedAssetId]) {
      resolvedSrc = undefined // Force AssetIcon to use assetId lookup
    } else {
      const localAsset = Object.values(assets).find(a => a?.symbol === token.symbol)
      if (localAsset) {
        resolvedAssetId = localAsset.assetId
        resolvedSrc = undefined
      } else {
        resolvedAssetId = undefined
      }
    }

    return { ...token, resolvedAssetId, resolvedSrc }
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
          <AssetIcon
            {...(assetInfo.resolvedAssetId
              ? { assetId: assetInfo.resolvedAssetId }
              : { src: assetInfo.resolvedSrc })}
            size='lg'
          />
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
          {filteredYields.map(yieldItem => (
            <YieldCard
              key={yieldItem.id}
              yield={yieldItem}
              onEnter={() => navigate(`/yields/${yieldItem.id}`)}
              assetId={assetInfo?.resolvedAssetId}
              assetSrc={assetInfo?.resolvedSrc}
            />
          ))}
        </SimpleGrid>
      )}
    </Container>
  )
}
