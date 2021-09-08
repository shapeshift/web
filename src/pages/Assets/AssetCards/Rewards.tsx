import { Button, Flex, Stack, Tag } from '@chakra-ui/react'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { RawText, Text } from 'components/Text'

export const Rewards = () => {
  return (
    <Card variant='unstyled' size='sm' my={6}>
      <Card.Header>
        <Card.Heading color='gray.400'>
          <Text translation={'assets.assetCards.staking'} />
        </Card.Heading>
      </Card.Header>
      <Card.Body pt={0}>
        <Stack spacing={2} mt={2} mx={-4}>
          <Button width='full' height='auto' justifyContent='space-between' variant='ghost' py={2}>
            <Flex alignItems='center'>
              <Flex>
                <AssetIcon symbol='fox' boxSize='8' mr={2} />
              </Flex>
              <RawText size='lg'>0.055555 FOX</RawText>
            </Flex>
            <Flex>
              <Tag colorScheme='green'>640% APR</Tag>
            </Flex>
          </Button>
          <Button width='full' height='auto' justifyContent='space-between' variant='ghost' py={2}>
            <Flex alignItems='center'>
              <Flex>
                <AssetIcon symbol='eth' boxSize='8' mr={2} />
              </Flex>
              <RawText size='lg'>0.055555 USDC</RawText>
            </Flex>
            <Flex>
              <Tag colorScheme='green'>17.7% APR</Tag>
            </Flex>
          </Button>
        </Stack>
      </Card.Body>
    </Card>
  )
}
