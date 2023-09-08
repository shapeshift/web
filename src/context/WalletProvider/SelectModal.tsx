import { CheckCircleIcon } from '@chakra-ui/icons'
import {
  Button,
  Center,
  Flex,
  Grid,
  ModalBody,
  ModalHeader,
  useColorModeValue,
} from '@chakra-ui/react'
import { getConfig } from 'config'
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
  } = useWallet()
  const translate = useTranslate()

  const wallets = Object.values(KeyManager).filter(key => key !== KeyManager.Demo)
  const greenColor = useColorModeValue('green.500', 'green.200')

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.selectModal.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={6} color='text.subtle' translation={'walletProvider.selectModal.body'} />
        <Grid mb={6} gridTemplateColumns={{ base: '1fr', md: '1fr 1fr' }} gridGap={4}>
          {adapters &&
            // TODO: KeepKey adapter may fail due to the USB interface being in use by another tab
            // So not all of the supported wallets will have an initialized adapter
            wallets.map(walletType => {
              const option = SUPPORTED_WALLETS[walletType]
              // some wallets (e.g. keepkey) do not exist on mobile

              const isCoinbaseEnabled = getConfig().REACT_APP_FEATURE_COINBASE_WALLET
              if (walletType === KeyManager.Coinbase && !isCoinbaseEnabled) return null

              const isWalletConnectV2Enabled = getConfig().REACT_APP_FEATURE_WALLET_CONNECT_V2
              if (walletType === KeyManager.WalletConnectV2 && !isWalletConnectV2Enabled)
                return null

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
                  justifyContent='space-between'
                  onClick={() => connect(walletType)}
                  data-test={`connect-wallet-${walletType}-button`}
                >
                  <Flex alignItems='flex-start' flexDir='column'>
                    <RawText fontWeight='semibold'>{option.name}</RawText>
                    {<Text fontSize='xs' color='text.subtle' translation={walletSubText} />}
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
        <Flex direction={['column', 'row']} mt={2} justifyContent='center' alignItems='center'>
          <Text
            mb={[3]}
            color='text.subtle'
            translation={walletInfo?.name ? 'common.or' : 'walletProvider.selectModal.footer'}
          />
          <Button
            variant='link'
            mb={[3]}
            ml={[0, 1.5]}
            borderTopRadius='none'
            colorScheme='blue'
            onClick={() => create(isMobileApp ? KeyManager.Mobile : KeyManager.Native)}
            data-test='connect-wallet-create-one-button'
          >
            {translate('walletProvider.selectModal.create')}
          </Button>
        </Flex>
      </ModalBody>
    </>
  )
}
