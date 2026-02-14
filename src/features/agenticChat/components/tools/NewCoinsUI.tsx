import { Flex, Icon, Text, useColorModeValue } from '@chakra-ui/react'
import { FaStar } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import type { ToolUIProps } from '../../types/toolInvocation'
import { AssetListItem } from '../shared/AssetListItem'
import { DisplayToolCard } from './DisplayToolCard'

export const NewCoinsUI = ({ toolPart }: ToolUIProps<'getNewCoinsTool'>) => {
  const translate = useTranslate()
  const { state, output: toolOutput } = toolPart

  const borderColor = useColorModeValue('gray.200', 'gray.600')

  if (state === 'output-error' || !toolOutput) {
    return null
  }

  const { coins } = toolOutput

  if (!coins || coins.length === 0) {
    return null
  }

  return (
    <DisplayToolCard.Root>
      <DisplayToolCard.Header>
        <DisplayToolCard.HeaderRow>
          <Flex alignItems='center' gap={2}>
            <Icon as={FaStar} boxSize={5} color='purple.500' />
            <Text fontSize='lg' fontWeight='semibold'>
              {translate('agenticChat.agenticChatTools.newCoins.title')}
            </Text>
          </Flex>
        </DisplayToolCard.HeaderRow>
      </DisplayToolCard.Header>
      <DisplayToolCard.Content>
        <Flex direction='column'>
          {coins.map((coin, index) => (
            <Flex
              key={coin.id}
              borderTopWidth={index > 0 ? 1 : 0}
              borderColor={borderColor}
              width='full'
            >
              <AssetListItem
                name={coin.name}
                symbol={coin.symbol}
                assetId={coin.assetId}
                subtitle={coin.activatedAtFormatted}
              />
            </Flex>
          ))}
        </Flex>
      </DisplayToolCard.Content>
    </DisplayToolCard.Root>
  )
}
