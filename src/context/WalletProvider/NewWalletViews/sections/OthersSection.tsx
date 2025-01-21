import { Box, Button, Flex, Stack, useColorModeValue } from '@chakra-ui/react'
import { useCallback } from 'react'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { Text } from 'components/Text'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useWallet } from 'hooks/useWallet/useWallet'

const WalletConnectOption = ({
  connect,
  isSelected,
  isDisabled,
}: {
  connect: () => void
  isSelected: boolean
  isDisabled: boolean
}) => {
  const backgroundColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')

  return (
    <Box
      as={Button}
      key='walletconnect'
      variant='ghost'
      px={4}
      ml={-4}
      py={6}
      borderRadius='md'
      width='full'
      onClick={connect}
      bg={isSelected ? backgroundColor : undefined}
      isDisabled={isDisabled}
    >
      <Flex alignItems='center' width='full'>
        <Box boxSize='24px' mr={3}>
          <WalletConnectIcon />
        </Box>
        <Text
          translation='plugins.walletConnectToDapps.modal.title'
          fontSize='md'
          fontWeight='medium'
        />
      </Flex>
    </Box>
  )
}

export const OthersSection = ({
  isLoading,
  selectedWalletId,
  onWalletSelect,
}: {
  isLoading: boolean
  selectedWalletId: string | null
  onWalletSelect: (id: string, initialRoute: string) => void
}) => {
  const { connect } = useWallet()

  const handleConnectWalletConnect = useCallback(() => {
    onWalletSelect(KeyManager.WalletConnectV2, '/walletconnectv2/connect')
    connect(KeyManager.WalletConnectV2, false)
  }, [connect, onWalletSelect])

  return (
    <Stack spacing={2} my={6}>
      <Text fontSize='sm' fontWeight='medium' color='gray.500' translation='common.others' />
      <WalletConnectOption
        connect={handleConnectWalletConnect}
        isSelected={selectedWalletId === KeyManager.WalletConnectV2}
        isDisabled={isLoading && selectedWalletId !== KeyManager.WalletConnectV2}
      />
    </Stack>
  )
}
