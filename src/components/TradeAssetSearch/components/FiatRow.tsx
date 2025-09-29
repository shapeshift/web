import { Box, Button, Flex, Text, useColorModeValue } from '@chakra-ui/react'
import { useCallback } from 'react'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import type { FiatCurrencyItem } from '@/lib/fiatCurrencies/fiatCurrencies'
import { fiatCurrencyFlagUrlsByCode } from '@/lib/fiatCurrencies/fiatCurrencies'

type FiatRowProps = {
  fiat: FiatCurrencyItem
  onClick?: (fiat: FiatCurrencyItem) => void
}

export const FiatRow = ({ fiat, onClick }: FiatRowProps) => {
  const handleClick = useCallback(() => onClick?.(fiat), [fiat, onClick])

  const fiatNameColor = useColorModeValue('black', 'white')

  return (
    <Button
      variant='ghost'
      onClick={handleClick}
      justifyContent='space-between'
      width='100%'
      py={8}
    >
      <Flex gap={4} alignItems='center' flex={1} minWidth={0}>
        <LazyLoadAvatar
          src={fiatCurrencyFlagUrlsByCode[fiat.code]}
          size='sm'
          flexShrink={0}
          name={fiat.name}
        />
        <Box textAlign='left' flex={1} minWidth={0}>
          <Text
            color={fiatNameColor}
            lineHeight={1}
            textOverflow='ellipsis'
            whiteSpace='nowrap'
            overflow='hidden'
          >
            {fiat.code} - {fiat.name}
          </Text>
        </Box>
      </Flex>
    </Button>
  )
}
