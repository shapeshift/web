import { Avatar, Box, Button, Flex, Image, Stack, useColorModeValue } from '@chakra-ui/react'
import type { FC } from 'react'
import bannerImg from 'assets/dapps-banner.png'
import { WalletConnectCurrentColorIcon } from 'components/Icons/WalletConnectIcon'
import { Text } from 'components/Text'

export const ExplorationBanner: FC = () => (
  <Box
    borderWidth={1}
    borderColor={useColorModeValue('blackAlpha.50', 'gray.750')}
    borderRadius='lg'
  >
    <Stack direction='row' spacing={4}>
      <Flex flex={1}>
        <Image objectFit='cover' boxSize='100%' src={bannerImg} />
      </Flex>
      <Stack flex={2} alignSelf='center' spacing={4} p={8}>
        <Avatar
          bg='gray.700'
          icon={<WalletConnectCurrentColorIcon color={useColorModeValue('blue.500', 'blue.400')} />}
        />

        <Box>
          <Text
            as='b'
            fontSize='lg'
            translation='plugins.walletConnectToDapps.registry.banner.title'
          />
          <Text
            translation='plugins.walletConnectToDapps.registry.banner.subtitle'
            color='gray.500'
          />
        </Box>

        <Stack direction='row'>
          <Button
            colorScheme='blue'
            size='sm'
            // TODO(0xdef1cafe): wire this up
            onClick={() => alert('TODO: dApp connection flow (will be done in a future PR)')}
          >
            <Text translation='plugins.walletConnectToDapps.registry.getStarted' />
          </Button>
          <Button
            colorScheme='blue'
            size='sm'
            variant='ghost'
            // TODO(0xdef1cafe): wire this up
            onClick={() => alert('TODO: open ZenDesk article')}
          >
            <Text translation='plugins.walletConnectToDapps.registry.learnMore' />
          </Button>
        </Stack>
      </Stack>
    </Stack>
  </Box>
)
