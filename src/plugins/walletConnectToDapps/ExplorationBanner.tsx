import { Avatar, Box, Button, Flex, Image, Stack, useColorModeValue } from '@chakra-ui/react'
import bannerImg from 'assets/dapps-banner.png'
import { Card } from 'components/Card/Card'
import { WalletConnectCurrentColorIcon } from 'components/Icons/WalletConnectIcon'
import { Text } from 'components/Text'
import { FC } from 'react'

export const ExplorationBanner: FC = () => (
  <Card>
    <Stack direction='row'>
      <Flex flex={1}>
        <Image objectFit='cover' boxSize='100%' src={bannerImg} />
      </Flex>
      <Stack flex={2} alignSelf='center' spacing={4} p={8}>
        <Avatar
          bg='gray.700'
          icon={<WalletConnectCurrentColorIcon color={useColorModeValue('blue.500', 'blue.400')} />}
        />

        <Box>
          <Text as='b' fontSize='lg' translation='plugins.walletConnectToDapps.banner.title' />
          <Text translation='plugins.walletConnectToDapps.banner.subtitle' color='gray.500' />
        </Box>

        <Stack direction='row'>
          <Button colorScheme='blue' size='sm' onClick={() => alert('get started :)')}>
            <Text translation='plugins.walletConnectToDapps.getStarted' />
          </Button>
          <Button
            colorScheme='blue'
            size='sm'
            variant='ghost'
            onClick={() => alert('learn more :)')}
          >
            <Text translation='plugins.walletConnectToDapps.learnMore' />
          </Button>
        </Stack>
      </Stack>
    </Stack>
  </Card>
)
