import { Avatar, Button, Box, Flex, Image, Stack, useColorModeValue } from '@chakra-ui/react'
import type { FC } from 'react'
import { WalletConnectCurrentColorIcon } from 'components/Icons/WalletConnectIcon'
import { Text } from 'components/Text'

type Props = {
  spotlight: {
    image: string
    name: string
    homepage:string
    description:string
  },
  size: number
  openDapp: any
}

export const ExplorationBanner: FC<Props> = ({spotlight, openDapp}) => (
  <Box
    borderWidth={1}
    borderColor={useColorModeValue('blackAlpha.50', 'gray.750')}
    borderRadius='lg'
  >
    <Stack direction='row' spacing={4}>
      <Flex flex={1}>
        <Image objectFit='cover' boxSize='100%' src={spotlight.image} />
      </Flex>
      <h2>Todays Spotlight!</h2>
      <Stack flex={2} alignSelf='center' spacing={4} p={8}>
        <Avatar
          bg='gray.700'
          icon={<WalletConnectCurrentColorIcon color={useColorModeValue('blue.500', 'blue.400')} />}
        />

        <Box>
          <Text
            as='b'
            fontSize='lg'
            translation={spotlight.name}
          />
        </Box>
        <Stack direction='row'>
          <Button
            colorScheme='blue'
            size='sm'
            onClick={() => openDapp(spotlight)}
          >
            <Text translation='plugins.walletConnectToDapps.registry.getStarted' />
          </Button>
        </Stack>
      </Stack>
    </Stack>
  </Box>
)
