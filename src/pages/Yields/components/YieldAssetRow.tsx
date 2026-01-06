import {
  Box,
  Button,
  Flex,
  HStack,
  Skeleton,
  Stat,
  StatNumber,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'

import { AssetIcon } from '@/components/AssetIcon'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'

type YieldAssetRowProps = {
  yieldItem: AugmentedYieldDto
  isCompact?: boolean
}

export const YieldAssetRow = ({ yieldItem }: YieldAssetRowProps) => {
  const navigate = useNavigate()
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50')

  const apy = bnOrZero(yieldItem.rewardRate.total).times(100).toNumber()

  const handleClick = () => {
    navigate(`/yields/${yieldItem.id}`)
  }

  return (
    <Flex
      justify='space-between'
      align='center'
      p={3}
      borderRadius='lg'
      cursor='pointer'
      _hover={{ bg: hoverBg }}
      transition='all 0.2s'
      onClick={handleClick}
    >
      <HStack spacing={4}>
        <AssetIcon src={yieldItem.metadata.logoURI} size='sm' />
        <Box>
          <Text fontWeight='bold' fontSize='sm'>
            {yieldItem.metadata.name}
          </Text>
          <HStack spacing={2}>
            <Text fontSize='xs' color='text.subtle'>
              {yieldItem.providerId}
            </Text>
          </HStack>
        </Box>
      </HStack>

      <HStack spacing={6}>
        {/* APY Section */}
        <Stat textAlign='right' size='sm'>
          <StatNumber color='green.400' fontSize='md' fontWeight='bold'>
            {apy.toFixed(2)}%
          </StatNumber>
          <Text fontSize='xs' color='text.subtle' lineHeight={1}>
            APY
          </Text>
        </Stat>

        {/* Action Button */}
        <Button
          size='sm'
          variant='ghost'
          colorScheme='blue'
          rightIcon={<Text>→</Text>}
          display={{ base: 'none', md: 'flex' }}
        >
          Earn
        </Button>
      </HStack>
    </Flex>
  )
}

export const YieldAssetRowSkeleton = () => (
  <Flex
    justify='space-between'
    align='center'
    p={4}
    borderWidth='1px'
    borderColor='whiteAlpha.100'
    borderRadius='xl'
  >
    <HStack spacing={4}>
      <Skeleton borderRadius='full' boxSize='10' />
      <Box>
        <Skeleton height='16px' width='120px' mb={1} />
        <Skeleton height='12px' width='80px' />
      </Box>
    </HStack>
    <Skeleton height='24px' width='80px' />
  </Flex>
)
