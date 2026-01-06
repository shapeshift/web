import { Box, Button, Flex, Heading, Text, useColorModeValue } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'

type YieldOpportunityCardProps = {
    maxApyYield: AugmentedYieldDto
    onClick: (yieldItem: AugmentedYieldDto) => void
}

export const YieldOpportunityCard = ({ maxApyYield, onClick }: YieldOpportunityCardProps) => {
    const translate = useTranslate()
    const bg = useColorModeValue('gray.50', 'whiteAlpha.100')
    const borderColor = useColorModeValue('gray.100', 'whiteAlpha.100')

    const apy = bnOrZero(maxApyYield.rewardRate.total).times(100).toFixed(2)

    return (
        <Box
            bg={bg}
            borderRadius='xl'
            borderWidth={1}
            borderColor={borderColor}
            p={6}
            position='relative'
            overflow='hidden'
        >
            <Flex justify='space-between' align='center' direction={{ base: 'column', sm: 'row' }} gap={4}>
                <Box>
                    <Text color='text.subtle' fontSize='sm' mb={1}>
                        {translate('yieldXYZ.earnUpTo', { apy })}
                    </Text>
                    <Heading size='md' bgClip='text' bgGradient='linear(to-r, blue.400, purple.500)'>
                        {apy}% APY
                    </Heading>
                </Box>
                <Button
                    colorScheme='blue'
                    size='md'
                    onClick={() => onClick(maxApyYield)}
                    px={8}
                    bgGradient='linear(to-r, blue.500, purple.600)'
                    _hover={{
                        bgGradient: 'linear(to-r, blue.600, purple.700)',
                    }}
                >
                    {translate('yieldXYZ.startEarning')}
                </Button>
            </Flex>
        </Box>
    )
}
