import { Flex, Icon, Text, useColorModeValue } from '@chakra-ui/react'
import { FaFire } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import type { ToolUIProps } from '../../types/toolInvocation'
import { AssetListItem } from '../shared/AssetListItem'
import { DisplayToolCard } from './DisplayToolCard'

export const TrendingTokensUI = ({ toolPart }: ToolUIProps<'getTrendingTokensTool'>) => {
  const translate = useTranslate()
  const { state, output: toolOutput } = toolPart

  const borderColor = useColorModeValue('gray.200', 'gray.600')

  if (state === 'output-error' || !toolOutput) {
    return null
  }

  const { tokens } = toolOutput

  if (!tokens || tokens.length === 0) {
    return null
  }

  return (
    <DisplayToolCard.Root>
      <DisplayToolCard.Header>
        <DisplayToolCard.HeaderRow>
          <Flex alignItems='center' gap={2}>
            <Icon as={FaFire} boxSize={5} color='orange.500' />
            <Text fontSize='lg' fontWeight='semibold'>
              {translate('agenticChat.agenticChatTools.trendingTokens.title')}
            </Text>
          </Flex>
        </DisplayToolCard.HeaderRow>
      </DisplayToolCard.Header>
      <DisplayToolCard.Content>
        <Flex direction='column'>
          {tokens.map((token, index) => (
            <Flex
              key={token.id}
              borderTopWidth={index > 0 ? 1 : 0}
              borderColor={borderColor}
              width='full'
            >
              <AssetListItem
                name={token.name}
                symbol={token.symbol}
                assetId={token.assetId}
                price={token.price}
                priceChange24h={token.priceChange24h}
              />
            </Flex>
          ))}
        </Flex>
      </DisplayToolCard.Content>
    </DisplayToolCard.Root>
  )
}
