import { Box, Button, Flex, Icon, Text, useColorModeValue } from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { FaArrowDown, FaArrowUp } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import type { ToolUIProps } from '../../types/toolInvocation'
import { DisplayToolCard } from './DisplayToolCard'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from '@/lib/bignumber/bignumber'

const StatMetric = ({ label, value }: { label: string; value: string }) => {
  return (
    <Flex direction='column'>
      <Text fontSize='xl' fontWeight='bold'>
        {value}
      </Text>
      <Text fontSize='xs' color='gray.500' fontWeight='normal'>
        {label}
      </Text>
    </Flex>
  )
}

export const GetAssetsUI = ({ toolPart }: ToolUIProps<'getAssetsTool'>) => {
  const { state, output: toolOutput } = toolPart
  const { number } = useLocaleFormatter()
  const translate = useTranslate()

  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const mutedColor = useColorModeValue('gray.600', 'gray.400')
  const sentimentBg = useColorModeValue('gray.200', 'gray.700')

  const [descriptionExpanded, setDescriptionExpanded] = useState(false)

  const asset = useMemo(() => toolOutput?.assets?.[0], [toolOutput?.assets])

  const priceChange24h = useMemo(() => {
    if (!asset?.priceChange24h) return null
    const value = asset.priceChange24h
    const isPositive = value >= 0
    return {
      text: `${isPositive ? '+' : ''}${value.toFixed(2)}%`,
      color: isPositive ? 'green.500' : 'red.500',
      icon: isPositive ? FaArrowUp : FaArrowDown,
    }
  }, [asset?.priceChange24h])

  const volMcapRatio = useMemo(() => {
    if (!asset?.volume24h || !asset?.marketCap) return null
    const vol = bnOrZero(asset.volume24h)
    const mcap = bnOrZero(asset.marketCap)
    if (vol.isZero() || mcap.isZero()) return null
    return vol.div(mcap).times(100).toFixed(4)
  }, [asset?.volume24h, asset?.marketCap])

  const formatCompactNumber = useCallback(
    (value: string | null | undefined) => {
      if (!value) return 'N/A'
      const num = parseFloat(value)
      if (isNaN(num)) return 'N/A'
      return number.toString(num, { abbreviated: true, omitDecimalTrailingZeros: true })
    },
    [number],
  )

  if (state === 'output-error' || !toolOutput || !asset) {
    return null
  }

  const description =
    asset.description || translate('agenticChat.agenticChatTools.getAssets.noDescription')
  const shouldTruncate = description.length > 200
  const displayDescription =
    descriptionExpanded || !shouldTruncate ? description : `${description.slice(0, 200)}...`

  const hasSentiment =
    asset.sentimentVotesUpPercentage !== null || asset.sentimentVotesDownPercentage !== null

  return (
    <DisplayToolCard.Root>
      <DisplayToolCard.Header>
        <Flex direction='column' gap={1}>
          <Flex alignItems='start' justifyContent='space-between' w='full'>
            <Flex alignItems='center' gap={3}>
              <AssetIcon assetId={asset.assetId} size='md' />
              <Flex direction='column'>
                <Text fontSize='xl' fontWeight='bold' lineHeight='shorter'>
                  {asset.name}
                </Text>
                <Text fontSize='sm' color={mutedColor} fontWeight='normal' lineHeight='shorter'>
                  {asset.symbol.toUpperCase()}
                </Text>
              </Flex>
            </Flex>
            <Flex direction='column' alignItems='flex-end'>
              <Text fontSize='lg' fontWeight='bold' lineHeight='shorter'>
                <Amount.Fiat value={asset.price} />
              </Text>
              {priceChange24h && (
                <Flex alignItems='end' gap={1} lineHeight='shorter'>
                  <Flex alignItems='center' gap={1} color={priceChange24h.color}>
                    <Icon as={priceChange24h.icon} boxSize={4} />
                    <Text fontSize='sm' fontWeight='medium'>
                      {priceChange24h.text}
                    </Text>
                  </Flex>
                  <Text fontSize='xs' color={mutedColor} fontWeight='normal'>
                    {translate('agenticChat.agenticChatTools.getAssets.24h')}
                  </Text>
                </Flex>
              )}
            </Flex>
          </Flex>
        </Flex>
      </DisplayToolCard.Header>

      <DisplayToolCard.Content>
        <Flex direction='column' gap={4}>
          <Flex gap={4} flexWrap='wrap'>
            <StatMetric
              label={translate('agenticChat.agenticChatTools.getAssets.volume')}
              value={`$${formatCompactNumber(asset.volume24h)}`}
            />
            <StatMetric
              label={translate('agenticChat.agenticChatTools.getAssets.marketCap')}
              value={`$${formatCompactNumber(asset.marketCap)}`}
            />
            <StatMetric
              label={translate('agenticChat.agenticChatTools.getAssets.fdv')}
              value={`$${formatCompactNumber(asset.fdv)}`}
            />
          </Flex>

          {description && (
            <Box borderTopWidth={1} borderColor={borderColor} pt={4}>
              <Text fontSize='sm' fontWeight='medium' mb={2}>
                {translate('agenticChat.agenticChatTools.getAssets.about', {
                  symbol: asset.symbol.toUpperCase(),
                })}
              </Text>
              <Text
                fontSize='sm'
                color={mutedColor}
                fontWeight='normal'
                lineHeight='relaxed'
                whiteSpace='pre-wrap'
              >
                {displayDescription}
              </Text>
              {shouldTruncate && (
                <Button
                  size='sm'
                  variant='link'
                  colorScheme='purple'
                  onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                  mt={2}
                >
                  {descriptionExpanded
                    ? translate('agenticChat.agenticChatTools.getAssets.showLess')
                    : translate('agenticChat.agenticChatTools.getAssets.more')}
                </Button>
              )}
            </Box>
          )}

          {(asset.circulatingSupply || asset.totalSupply || asset.maxSupply) && (
            <Box borderTopWidth={1} borderColor={borderColor} pt={4}>
              <Text fontSize='sm' fontWeight='medium' mb={3}>
                {translate('agenticChat.agenticChatTools.getAssets.coinInfo')}
              </Text>
              <Flex direction='column' gap={2}>
                {asset.circulatingSupply && (
                  <DisplayToolCard.DetailItem
                    label={translate('agenticChat.agenticChatTools.getAssets.circulatingSupply')}
                    value={formatCompactNumber(asset.circulatingSupply)}
                  />
                )}
                {asset.totalSupply && (
                  <DisplayToolCard.DetailItem
                    label={translate('agenticChat.agenticChatTools.getAssets.totalSupply')}
                    value={formatCompactNumber(asset.totalSupply)}
                  />
                )}
                <DisplayToolCard.DetailItem
                  label={translate('agenticChat.agenticChatTools.getAssets.maxSupply')}
                  value={
                    asset.maxSupply
                      ? formatCompactNumber(asset.maxSupply)
                      : translate('agenticChat.agenticChatTools.getAssets.unlimited')
                  }
                />
              </Flex>
            </Box>
          )}

          {hasSentiment && (
            <Box borderTopWidth={1} borderColor={borderColor} pt={4}>
              <Text fontSize='sm' fontWeight='medium' mb={3}>
                {translate('agenticChat.agenticChatTools.getAssets.sentiment')}
              </Text>
              <Flex direction='column' gap={2}>
                {asset.sentimentVotesUpPercentage !== null &&
                  asset.sentimentVotesDownPercentage !== null && (
                    <>
                      <Flex gap={2} h={2} borderRadius='full' overflow='hidden' bg={sentimentBg}>
                        <Box bg='green.500' w={`${asset.sentimentVotesUpPercentage}%`} h='full' />
                        <Box bg='red.500' w={`${asset.sentimentVotesDownPercentage}%`} h='full' />
                      </Flex>
                      <Flex justifyContent='space-between' fontSize='sm'>
                        <Text color='green.500' fontWeight='medium'>
                          <Amount.Percent value={asset.sentimentVotesUpPercentage} />{' '}
                          {translate('agenticChat.agenticChatTools.getAssets.bullish')}
                        </Text>
                        <Text color='red.500' fontWeight='medium'>
                          <Amount.Percent value={asset.sentimentVotesDownPercentage} />{' '}
                          {translate('agenticChat.agenticChatTools.getAssets.bearish')}
                        </Text>
                      </Flex>
                    </>
                  )}
              </Flex>
            </Box>
          )}

          <Box borderTopWidth={1} borderColor={borderColor} pt={4}>
            <Flex gap={4} flexWrap='wrap'>
              {asset.marketCapRank && (
                <StatMetric
                  label={translate('agenticChat.agenticChatTools.getAssets.marketCapRank')}
                  value={`#${asset.marketCapRank}`}
                />
              )}
              <StatMetric
                label={translate('agenticChat.agenticChatTools.getAssets.volume24h')}
                value={`$${formatCompactNumber(asset.volume24h)}`}
              />
              <StatMetric
                label={translate('agenticChat.agenticChatTools.getAssets.volMcap')}
                value={volMcapRatio ? `${volMcapRatio}%` : 'N/A'}
              />
            </Flex>
          </Box>
        </Flex>
      </DisplayToolCard.Content>
    </DisplayToolCard.Root>
  )
}
