import { Box, Button, Flex } from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Text } from '@/components/Text/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { GradientApy } from '@/pages/Yields/components/GradientApy'

type YieldOpportunityCardProps = {
  maxApyYield: AugmentedYieldDto
  onClick: (yieldItem: AugmentedYieldDto) => void
}

const hoverStyle = { bgGradient: 'linear(to-r, blue.600, purple.700)' }

export const YieldOpportunityCard = memo(({ maxApyYield, onClick }: YieldOpportunityCardProps) => {
  const translate = useTranslate()

  const apy = useMemo(
    () => bnOrZero(maxApyYield.rewardRate.total).times(100).toFixed(2),
    [maxApyYield.rewardRate.total],
  )

  const startEarningText = useMemo(() => translate('yieldXYZ.startEarning'), [translate])

  const handleClick = useCallback(() => {
    onClick(maxApyYield)
  }, [onClick, maxApyYield])

  const apyComponent = useMemo(
    () => (
      <GradientApy as='span' fontWeight='bold' fontSize={{ base: 'lg', sm: 'md' }}>
        {apy}%
      </GradientApy>
    ),
    [apy],
  )

  return (
    <Box
      bg='background.surface.raised.base'
      borderRadius='xl'
      borderWidth={1}
      borderColor='border.base'
      p={{ base: 4, sm: 6 }}
    >
      <Flex justify='space-between' align='center' gap={4}>
        <Box flex={1}>
          <Text
            translation='yieldXYZ.earnUpToOnBalance'
            components={{ apy: apyComponent }}
            color='text.subtle'
            fontSize='sm'
          />
        </Box>
        <Button
          colorScheme='blue'
          size='md'
          onClick={handleClick}
          px={6}
          flexShrink={0}
          bgGradient='linear(to-r, blue.500, purple.600)'
          _hover={hoverStyle}
        >
          {startEarningText}
        </Button>
      </Flex>
    </Box>
  )
})
