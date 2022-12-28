import { CheckCircleIcon } from '@chakra-ui/icons'
import {
  Button,
  Center,
  Flex,
  Grid,
  ModalBody,
  ModalFooter,
  ModalHeader,
  useColorModeValue,
} from '@chakra-ui/react'
import { isMobile } from 'react-device-detect'
import { useTranslate } from 'react-polyglot'
import { RawText, Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isMobile as isMobileApp } from 'lib/globals'

import { SUPPORTED_WALLETS } from './config'
import { KeyManager } from './KeyManager'

export const SelectModal = () => {
  const {
    state: { adapters, walletInfo },
    connect,
    create,
    importWallet,
  } = useWallet()
  const translate = useTranslate()

  const wallets = Object.values(KeyManager).filter(key => key !== KeyManager.Demo)
  const greenColor = useColorModeValue('green.500', 'green.200')
  const activeBg = useColorModeValue('gray.200', 'gray.900')
  const borderColor = useColorModeValue('gray.200', 'gray.750')

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.selectModal.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={6} color='gray.500' translation={'walletProvider.selectModal.body'} />
        <Grid mb={6} gridTemplateColumns={{ base: '1fr', md: '1fr 1fr' }} gridGap={4}>
          {adapters &&
            // TODO: KeepKey adapter may fail due to the USB interface being in use by another tab
            // So not all of the supported wallets will have an initialized adapter
            wallets.map(walletType => {
              const option = SUPPORTED_WALLETS[walletType]
              // some wallets (e.g. tally ho, keepkey etc) do not exist on mobile

              const isSupported = (() => {
                if (isMobileApp) {
                  return ['both', 'app'].includes(String(option.supportsMobile))
                }
                if (isMobile) {
                  return ['both', 'browser'].includes(String(option.supportsMobile))
                }
                // Don't display mobile supported wallets on desktop
                return option.supportsMobile !== 'app'
              })()

              if (!isSupported) return null

              const Icon = option.icon
              const activeWallet = walletInfo?.name === option.name
              // TODO: We can probably do better than a hardcoded ETH-only option for Walletconnect here.
              const supportsETHOnly = option.name.toLowerCase() === KeyManager.WalletConnect
              const walletSubText = activeWallet
                ? 'common.connected'
                : supportsETHOnly
                ? 'common.walletSupportsETHOnly'
                : null

              return (
                <Button
                  key={walletType}
                  w='full'
                  size='md'
                  py={8}
                  isActive={activeWallet}
                  _active={{ bg: activeBg }}
                  justifyContent='space-between'
                  onClick={() => connect(walletType)}
                  data-test={`connect-wallet-${walletType}-button`}
                >
                  <Flex alignItems='flex-start' flexDir='column'>
                    <RawText fontWeight='semibold'>{option.name}</RawText>
                    {<Text fontSize='xs' color='gray.500' translation={walletSubText} />}
                  </Flex>
                  <Center width='25%'>
                    {activeWallet ? (
                      <CheckCircleIcon color={greenColor} />
                    ) : (
                      <Icon width='24px' height='auto' />
                    )}
                  </Center>
                </Button>
              )
            })}
        </Grid>
      </ModalBody>
      <ModalFooter
        borderTopWidth={1}
        pt={4}
        justifyContent='center'
        mx={-3}
        mb={-6}
        borderColor={borderColor}
      >
        <Flex direction={['column', 'row']} justifyContent='center' alignItems='center' gap={2}>
          {!walletInfo?.name && (
            <Text color='gray.500' translation={'walletProvider.selectModal.footer'} />
          )}

          <Flex gap={1} alignItems='center'>
            <Button
              variant='link'
              borderTopRadius='none'
              colorScheme='blue'
              onClick={() => create(isMobileApp ? KeyManager.Mobile : KeyManager.Native)}
              data-test='connect-wallet-create-one-button'
            >
              {translate('walletProvider.selectModal.create')}
            </Button>
            <Text translation='common.or' color='gray.500' />
            <Button
              variant='link'
              borderTopRadius='none'
              colorScheme='blue'
              onClick={() => importWallet(isMobileApp ? KeyManager.Mobile : KeyManager.Native)}
              data-test='connect-wallet-import-one-button'
            >
              {translate('walletProvider.selectModal.import')}
            </Button>
          </Flex>
        </Flex>
      </ModalFooter>
    </>
  )
}
