import { Box, Flex, Icon, Text, useColorModeValue } from '@chakra-ui/react'
import { FaArrowDown, FaArrowUp } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import type { ToolUIProps } from '../../types/toolInvocation'
import { AssetListItem } from '../shared/AssetListItem'
import { DisplayToolCard } from './DisplayToolCard'

type GainerLoserCardProps = {
  items: {
    id: string
    assetId?: string
    symbol: string
    name: string
    price: string | null
    priceChange24h: number
  }[]
  title: string
  iconColor: string
  iconComponent: typeof FaArrowUp | typeof FaArrowDown
  variant: 'gain' | 'loss'
}

const GainerLoserCard = ({
  items,
  title,
  iconColor,
  iconComponent,
  variant,
}: GainerLoserCardProps) => {
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  if (items.length === 0) return null

  return (
    <DisplayToolCard.Root>
      <DisplayToolCard.Header>
        <DisplayToolCard.HeaderRow>
          <Flex alignItems='center' gap={2}>
            <Icon as={iconComponent} boxSize={5} color={iconColor} />
            <Text fontSize='lg' fontWeight='semibold'>
              {title}
            </Text>
          </Flex>
        </DisplayToolCard.HeaderRow>
      </DisplayToolCard.Header>
      <DisplayToolCard.Content>
        <Flex direction='column'>
          {items.map((coin, index) => (
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
                price={coin.price}
                priceChange24h={coin.priceChange24h}
                variant={variant}
              />
            </Flex>
          ))}
        </Flex>
      </DisplayToolCard.Content>
    </DisplayToolCard.Root>
  )
}

export const TopGainersLosersUI = ({ toolPart }: ToolUIProps<'getTopGainersLosersTool'>) => {
  const translate = useTranslate()
  const { state, output: toolOutput } = toolPart

  if (state === 'output-error' || !toolOutput) {
    return null
  }

  const { gainers, losers, duration } = toolOutput

  if (gainers.length === 0 && losers.length === 0) {
    return null
  }

  return (
    <Box>
      <GainerLoserCard
        items={gainers}
        title={translate('agenticChat.agenticChatTools.topGainersLosers.gainersTitle', {
          duration,
        })}
        iconColor='green.500'
        iconComponent={FaArrowUp}
        variant='gain'
      />
      {gainers.length > 0 && losers.length > 0 && <Box h={3} />}
      <GainerLoserCard
        items={losers}
        title={translate('agenticChat.agenticChatTools.topGainersLosers.losersTitle', { duration })}
        iconColor='red.500'
        iconComponent={FaArrowDown}
        variant='loss'
      />
    </Box>
  )
}
