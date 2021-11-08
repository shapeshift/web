import { Box, Flex } from '@chakra-ui/react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { usePortfolio } from 'pages/Dashboard/contexts/PortfolioContext'

export const Allocations = ({ fiatValue, color }: { fiatValue: string; color?: string }) => {
  const { totalBalance } = usePortfolio()
  /* @TODO: Need to get actual asset color */
  const value = bnOrZero(fiatValue).div(bnOrZero(totalBalance)).times(100).toNumber()
  return (
    <Flex
      height='8px'
      width='100px'
      bg='gray.700'
      borderRadius='full'
      overflow='hidden'
      position='relative'
      justifyContent='flex-end'
      ml='auto'
    >
      <Box
        width={`${value < 5 ? 10 : value}%`}
        backgroundColor='blue.500'
        height='8px'
        position='absolute'
        borderRadius='full'
      />
    </Flex>
  )
}
