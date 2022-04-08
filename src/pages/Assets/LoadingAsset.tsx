import {
  Box,
  Flex,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Stack,
  Stat,
  StatGroup,
} from '@chakra-ui/react'
import { Card } from 'components/Card/Card'
import { GraphLoading } from 'components/Graph/GraphLoading'
import { Page } from 'components/Layout/Page'

export const LoadingAsset = () => {
  const isLoaded = false
  return (
    <Page style={{ width: '100%' }}>
      <Flex flexGrow={1} zIndex={2} flexDir={{ base: 'column', lg: 'row' }}>
        <Stack
          spacing='1.5rem'
          maxWidth={{ base: 'auto', lg: '50rem' }}
          flexBasis='50rem'
          p={{ base: 0, lg: 4 }}
          mx={{ base: 0, lg: 'auto' }}
        >
          <Card variant='footer-stub'>
            <Card.Header display='flex' alignItems='center' flexDir={{ base: 'column', lg: 'row' }}>
              <Flex alignItems='center' mr='auto'>
                <SkeletonCircle boxSize='60px' isLoaded={isLoaded} />
                <SkeletonText noOfLines={2} width='100px' ml={4} />
              </Flex>
            </Card.Header>
            <Card.Body>
              <Box>
                <Flex
                  justifyContent={{ base: 'center', md: 'space-between' }}
                  width='full'
                  flexDir={{ base: 'column', md: 'row' }}
                >
                  <Skeleton isLoaded={isLoaded} textAlign='center' />
                </Flex>
                <Box width='full' alignItems='center' display='flex' flexDir='column' mt={6}>
                  <Card.Heading fontSize='4xl' lineHeight={1} mb={2}>
                    <Skeleton isLoaded={isLoaded}></Skeleton>
                  </Card.Heading>
                  <StatGroup>
                    <Stat size='sm' display='flex' flex='initial' mr={2}>
                      <Skeleton isLoaded={isLoaded}></Skeleton>
                    </Stat>
                  </StatGroup>
                </Box>
              </Box>
            </Card.Body>
            <GraphLoading />
            <Card.Footer>
              <SkeletonText noOfLines={4} />
            </Card.Footer>

            <Card.Footer>
              <SkeletonText noOfLines={6} />
            </Card.Footer>
          </Card>
        </Stack>
      </Flex>
    </Page>
  )
}
