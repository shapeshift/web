import { Flex, HStack } from '@chakra-ui/layout'
import { Button, Skeleton, SkeletonCircle } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import { useHistory, useLocation } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { RawText, Text } from 'components/Text'

// TODO: add proper args and types for Cosmos chains; wire up
export const StakingOpportunitiesRow = ({ name }: { name: string }) => {
  const isLoaded = true
  const history = useHistory()
  const location = useLocation()

  const handleClick = () => {
    history.push({
      pathname: `/defi/vault/cosmos/get-started`,
      state: { background: location }
    })
  }

  return (
    <Button
      width='full'
      height='auto'
      justifyContent='space-between'
      variant='ghost'
      fontWeight='normal'
      py={2}
      onClick={handleClick}
    >
      <Flex alignItems='center'>
        <Flex mr={4}>
          <SkeletonCircle boxSize='8' isLoaded={isLoaded}>
            <AssetIcon
              src={'https://assets.coingecko.com/coins/images/16724/small/osmo.png?1632763885'}
              boxSize='8'
            />
          </SkeletonCircle>
        </Flex>
        <Skeleton isLoaded={isLoaded}>
          <RawText size='lg' fontWeight='bold'>{`${name}`}</RawText>
        </Skeleton>
        <Skeleton isLoaded={isLoaded} ml={4}>
          <Tag colorScheme='green'>
            <Amount.Percent value={'1.24'} />
          </Tag>
        </Skeleton>
      </Flex>
      <Flex>
        <Skeleton isLoaded={isLoaded}>
          {false ? (
            <HStack>
              <Amount.Fiat value={'20.00'} color='green.500' />
              <Amount.Crypto value={'10'} symbol={'OSMO'} prefix='≈' />
            </HStack>
          ) : (
            <Button as='span' colorScheme='blue' variant='ghost-filled' size='sm'>
              <Text translation='common.getStarted' />
            </Button>
          )}
        </Skeleton>
      </Flex>
    </Button>
  )
}
