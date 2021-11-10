import { Box, Flex } from '@chakra-ui/layout'
import {
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Stat,
  StatGroup,
  StatLabel,
  StatNumber
} from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { RawText, Text } from 'components/Text'

type PoolProps = {
  token0: string
  token1: string
  tokenAmount: string
  fiatAmount: string
  isLoaded: boolean
}

export const PoolCard = ({ token0, token1, tokenAmount, fiatAmount, isLoaded }: PoolProps) => {
  return (
    <Card>
      <Card.Body>
        <Flex alignItems='center'>
          <Flex>
            <SkeletonCircle boxSize='10' isLoaded={isLoaded} mr={-3}>
              <AssetIcon symbol={token0.toLowerCase()} boxSize='10' boxShadow='right' zIndex={2} />
            </SkeletonCircle>
            <SkeletonCircle boxSize='10' isLoaded={isLoaded}>
              <AssetIcon symbol={token1.toLowerCase()} boxSize='10' />
            </SkeletonCircle>
          </Flex>
          <Box ml={4}>
            <SkeletonText isLoaded={isLoaded} noOfLines={2}>
              <RawText size='lg' fontWeight='bold' textTransform='uppercase' lineHeight={1} mb={1}>
                {`${token0} • ${token1}`}
              </RawText>
              <Amount.Crypto color='gray.500' value={tokenAmount} symbol='LP' lineHeight={1} />
            </SkeletonText>
          </Box>
        </Flex>
      </Card.Body>
      <Card.Footer>
        <StatGroup>
          <Stat>
            <Skeleton isLoaded={isLoaded}>
              <StatLabel>
                <Text translation='earn.poolValue' />
              </StatLabel>
            </Skeleton>
            <Skeleton isLoaded={isLoaded}>
              <StatNumber>
                <Amount.Fiat value={fiatAmount} />
              </StatNumber>
            </Skeleton>
          </Stat>
          <Stat textAlign='right'>
            <Skeleton isLoaded={isLoaded} maxWidth='100px' ml='auto'>
              <StatLabel>
                <Text translation='earn.currentAPY' />
              </StatLabel>
            </Skeleton>
            <Skeleton isLoaded={isLoaded} maxWidth='100px' ml='auto'>
              <StatNumber color='green.500'>
                <Amount.Percent value={0.12} />
              </StatNumber>
            </Skeleton>
          </Stat>
        </StatGroup>
      </Card.Footer>
    </Card>
  )
}
