import { Button, Flex, Stack, Tag } from '@chakra-ui/react'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { RawText, Text } from 'components/Text'

export const Pools = () => {
  return (
    <Card variant='unstyled' size='sm' my={6}>
      <Card.Header>
        <Card.Heading color='gray.400'>
          <Text translation={'assets.assetCards.pools'} />
        </Card.Heading>
      </Card.Header>
      <Card.Body pt={0}>
        <Stack spacing={2} mt={2} mx={-4}>
          <Button width='full' height='auto' justifyContent='space-between' variant='ghost' py={2}>
            <Flex alignItems='center'>
              <Flex>
                <AssetIcon symbol='sushi' boxSize='8' boxShadow='right' zIndex={2} mr={-3} />
                <AssetIcon symbol='eth' boxSize='8' mr={2} />
              </Flex>
              <RawText size='lg'>SUSHI/ETH</RawText>
            </Flex>
            <Flex>
              <Tag colorScheme='green'>0.81% APR</Tag>
            </Flex>
          </Button>
          <Button width='full' height='auto' variant='ghost' justifyContent='space-between' py={2}>
            <Flex alignItems='center'>
              <Flex>
                <AssetIcon symbol='dai' boxSize='8' boxShadow='right' zIndex={2} mr={-3} />
                <AssetIcon symbol='eth' boxSize='8' mr={2} />
              </Flex>
              <RawText size='lg'>DAI/ETH</RawText>
            </Flex>
            <Flex>
              <Tag colorScheme='green'>0.04% APR</Tag>
            </Flex>
          </Button>
        </Stack>
      </Card.Body>
    </Card>
  )
}
