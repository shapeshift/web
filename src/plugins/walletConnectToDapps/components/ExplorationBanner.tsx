import { Avatar, Box, Button, Flex, Image, Link, Stack, useColorModeValue } from '@chakra-ui/react'
import type { FC } from 'react'
import bannerImg from 'assets/dapps-banner.png'
import { WalletConnectCurrentColorIcon } from 'components/Icons/WalletConnectIcon'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

export const ExplorationBanner: FC = () => {
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  return (
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
            icon={
              <WalletConnectCurrentColorIcon color={useColorModeValue('blue.500', 'blue.400')} />
            }
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
            {!isConnected && (
              <Button
                colorScheme='blue'
                size='sm'
                onClick={() => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })}
              >
                <Text translation='plugins.walletConnectToDapps.registry.getStarted' />
              </Button>
            )}
            <Button
              as={Link}
              colorScheme='blue'
              size='sm'
              variant='ghost'
              href='https://shapeshift.zendesk.com/hc/en-us/articles/10316252789645'
              isExternal
            >
              <Text translation='plugins.walletConnectToDapps.registry.learnMore' />
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  )
}
