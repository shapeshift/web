import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Flex, HStack, Stack, Tag } from '@chakra-ui/react'
import { ChainTypes } from '@shapeshiftoss/types'
import { FeatureFlagEnum } from 'constants/FeatureFlagEnum'
import qs from 'qs'
import { Link, useLocation } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { RawText, Text } from 'components/Text'
import { useFeature } from 'hooks/useFeature/useFeature'

export const Rewards = () => {
  const location = useLocation()
  const earnFeature = useFeature(FeatureFlagEnum.Yearn)
  if (!earnFeature) return null

  const active = false

  return (
    <Card>
      <Card.Header>
        <Card.Heading display='flex' alignItems='center'>
          <Text translation={'assets.assetCards.stakingVaults'} />
          <Button size='sm' ml='auto' variant='link' colorScheme='blue'>
            See All <ArrowForwardIcon />
          </Button>
        </Card.Heading>
      </Card.Header>
      <Card.Body pt={0}>
        <Stack spacing={2} mt={2} mx={-4}>
          <Button
            as={Link}
            width='full'
            height='auto'
            justifyContent='space-between'
            variant='ghost'
            py={2}
            to={{
              pathname: '/earn/vault/yearn/deposit',
              search: qs.stringify({
                chain: ChainTypes.Ethereum,
                contractAddress: '0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9', // yvUSDC vault address
                tokenId: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
              }),
              state: { background: location }
            }}
          >
            <Flex alignItems='center'>
              <Flex>
                <AssetIcon symbol='usdc' boxSize='8' mr={2} />
              </Flex>
              <RawText size='lg'>USDC Vault</RawText>
              <Tag colorScheme='green' ml={4}>
                5% APR
              </Tag>
            </Flex>
            <Flex>
              {!active ? (
                <HStack>
                  <Amount.Fiat value='1000' color='green.500' />
                  <Amount.Crypto value='1000' symbol='USDC' prefix='≈' />
                </HStack>
              ) : (
                <Button colorScheme='blue' variant='ghost-filled' size='sm'>
                  Get Started
                </Button>
              )}
            </Flex>
          </Button>
        </Stack>
      </Card.Body>
    </Card>
  )
}
