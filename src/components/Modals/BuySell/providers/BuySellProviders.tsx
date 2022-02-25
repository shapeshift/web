import { ChevronRightIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, Stack, Tag } from '@chakra-ui/react'
import { useHistory } from 'react-router-dom'
import gemlogo from 'assets/gem-mark.png'
import onjunologo from 'assets/onjuno.png'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'

import { BuySellRoutes } from '../BuySell'

export const BuySellProviders = () => {
  const history = useHistory()

  return (
    <Flex justifyContent='center' alignItems='center'>
      <Card boxShadow='none' borderWidth={0} maxWidth='500px'>
        <Card.Header>
          <Card.Heading>
            <Text translation='buysell.title' />
          </Card.Heading>
        </Card.Header>
        <Card.Body>
          <Text lineHeight={1.2} color='gray.500' translation='buysell.titleMessage' />
          <Stack spacing={2} mt={2} mx={-4}>
            <Button
              width='full'
              height='auto'
              justifyContent='space-between'
              variant='ghost'
              fontWeight='normal'
              py={2}
              onClick={() => history.push(BuySellRoutes.Gem)}
              rightIcon={<ChevronRightIcon boxSize={6} />}
            >
              <Flex flexDirection='row' justifyContent='center' alignItems='center'>
                <AssetIcon src={gemlogo} />
                <Box textAlign='left' ml={2}>
                  <Text fontWeight='bold' color='white' translation='buysell.gem' />
                  <Text translation='buysell.gemMessage' />
                </Box>
              </Flex>
              <Tag colorScheme='green'>
                <Text translation='buysell.buy' style={{ textTransform: 'uppercase' }} />
              </Tag>
              <Tag colorScheme='gray'>
                <Text translation='buysell.sell' style={{ textTransform: 'uppercase' }} />
              </Tag>
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
                  <Text fontWeight='bold' color='white' translation='buysell.onJuno' />
                  <Text translation='buysell.comingSoon' />
                </Box>
              </Flex>
            </Button>
          </Stack>
        </Card.Body>
      </Card>
    </Flex>
  )
}
