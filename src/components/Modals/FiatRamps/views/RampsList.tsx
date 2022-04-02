import { ChevronRightIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, Stack, Tag } from '@chakra-ui/react'
import { useHistory } from 'react-router-dom'
import gemlogo from 'assets/gem-mark.png'
import onjunologo from 'assets/onjuno.png'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'

import { FiatRampsRoutes } from '../FiatRampsCommon'

export const RampsList = () => {
  const history = useHistory()

  return (
    <Flex justifyContent='center' alignItems='center' width={'32rem'}>
      <Card boxShadow='none' borderWidth={0}>
        <Card.Header>
          <Card.Heading>
            <Text translation='fiatRamps.title' />
          </Card.Heading>
        </Card.Header>
        <Card.Body>
          <Text lineHeight={1.2} color='gray.500' translation='fiatRamps.titleMessage' />
          <Stack spacing={2} mt={2} mx={-4}>
            <Button
              width='full'
              height='auto'
              justifyContent='space-between'
              variant='ghost'
              fontWeight='normal'
              py={2}
              onClick={() => history.push(FiatRampsRoutes.Gem)}
              rightIcon={<ChevronRightIcon boxSize={6} />}
            >
              <Flex flex={1} flexDirection='row' justifyContent='space-between' alignItems='center'>
                <Flex flexDirection='row' justifyContent='center' alignItems='center'>
                  <AssetIcon src={gemlogo} />
                  <Box textAlign='left' ml={2}>
                    <Text fontWeight='bold' translation='fiatRamps.gem' />
                    <Text translation='fiatRamps.gemMessage' />
                  </Box>
                </Flex>
                <Box>
                  <Tag colorScheme='green' mr={2}>
                    <Text translation='fiatRamps.buy' style={{ textTransform: 'uppercase' }} />
                  </Tag>
                  <Tag colorScheme='gray'>
                    <Text translation='fiatRamps.sell' style={{ textTransform: 'uppercase' }} />
                  </Tag>
                </Box>
              </Flex>
            </Button>
            <Button
              width='full'
              height='auto'
              justifyContent='flex-start'
              variant='ghost'
              fontWeight='normal'
              py={2}
            >
              <Flex flexDirection='row' justifyContent='center' alignItems='center'>
                <AssetIcon src={onjunologo} />
                <Box textAlign='left' ml={2}>
                  <Text fontWeight='bold' translation='fiatRamps.onJuno' />
                  <Text translation='fiatRamps.comingSoon' />
                </Box>
              </Flex>
            </Button>
          </Stack>
        </Card.Body>
      </Card>
    </Flex>
  )
}
