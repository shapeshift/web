import { Avatar, Box, Button, Flex, Link, Stack, useColorModeValue } from '@chakra-ui/react'
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
      borderWidth={{ base: 0, md: 1 }}
      borderColor={useColorModeValue('blackAlpha.50', 'gray.750')}
      borderRadius='lg'
      bgImage={{ base: 'none', lg: bannerImg }}
      backgroundRepeat='no-repeat'
      backgroundPosition='right center'
    >
      <Flex direction='row' gap={4}>
        <Stack ml={0} width='full' alignSelf='center' spacing={4} p={{ base: 4, md: 8 }}>
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
              variant='link'
              href='https://shapeshift.zendesk.com/hc/en-us/articles/10316252789645'
              isExternal
            >
              <Text translation='plugins.walletConnectToDapps.registry.learnMore' />
            </Button>
          </Stack>
        </Stack>
      </Flex>
    </Box>
  )
}
