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
import { isMobile } from 'react-device-detect'
import { useTranslate } from 'react-polyglot'
import { RawText, Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'

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
  const walletConnectFeatureFlag = useFeatureFlag('WalletConnectWallet')
  const greenColor = useColorModeValue('green.500', 'green.200')
  const activeBg = useColorModeValue('gray.200', 'gray.900')

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
            wallets.map(key => {
              const option = SUPPORTED_WALLETS[key]
              const Icon = option.icon
              const activeWallet = walletInfo?.name === option.name
              // TODO: We can probably do better than a hardcoded ETH-only option for Walletconnect here.
              const supportsETHOnly = option.name.toLowerCase() === KeyManager.WalletConnect
              const walletSubText = activeWallet
                ? 'common.connected'
                : supportsETHOnly
                ? 'common.walletSupportsETHOnly'
                : null

              // some wallets (e.g. tally ho) do not exist on mobile
              if (isMobile && !option.mobileEnabled) return false
              if (!walletConnectFeatureFlag && key === KeyManager.WalletConnect) return false

              return (
                <Button
                  key={key}
                  w='full'
                  size='md'
                  py={8}
                  isActive={activeWallet}
                  _active={{ bg: activeBg }}
                  justifyContent='space-between'
                  onClick={() => connect(key)}
                  data-test={`connect-wallet-${key}-button`}
                >
                  <Flex alignItems='flex-start' flexDir='column'>
                    <RawText fontWeight='semibold'>{option.name}</RawText>
                    {<Text fontSize='xs' color='gray.500' translation={walletSubText} />}
                  </Flex>
                  <Center width='25%'>
                    {activeWallet ? (
                      <CheckCircleIcon color={greenColor} />
                    ) : (
                      <Icon height='24px' w='auto' />
                    )}
                  </Center>
                </Button>
              )
            })}
        </Grid>
        <Flex direction={['column', 'row']} mt={2} justifyContent='center' alignItems='center'>
          <Text
            mb={[3]}
            color='gray.500'
            translation={walletInfo?.name ? 'common.or' : 'walletProvider.selectModal.footer'}
          />
          <Button
            variant='link'
            mb={[3]}
            ml={[0, 1.5]}
            borderTopRadius='none'
            colorScheme='blue'
            onClick={() => create(KeyManager.Native)}
            data-test='connect-wallet-create-one-button'
          >
            {translate('walletProvider.selectModal.create')}
          </Button>
        </Flex>
      </ModalBody>
    </>
  )
}
