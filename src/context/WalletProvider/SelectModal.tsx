import { CheckCircleIcon } from '@chakra-ui/icons'
import type { ResponsiveArray } from '@chakra-ui/react'
import {
  Button,
  Center,
  Flex,
  Grid,
  Image,
  ModalBody,
  ModalHeader,
  useColorModeValue,
} from '@chakra-ui/react'
import { getConfig } from 'config'
import type { Property } from 'csstype'
import type { EIP6963ProviderDetail } from 'mipd'
import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { isMobile } from 'react-device-detect'
import { useTranslate } from 'react-polyglot'
import { RawText, Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isMobile as isMobileApp } from 'lib/globals'
import { mipdStore } from 'lib/mipd'

import { SUPPORTED_WALLETS } from './config'
import { KeyManager } from './KeyManager'
import type { WalletInfo } from './WalletProvider'

const gridTemplateColumnsProp = { base: '1fr', md: '1fr 1fr' }
const flexDirProp: ResponsiveArray<Property.FlexDirection> = ['column', 'row']
const mbProp = [3]
const mlProp = [0, 1.5]

const WalletSelectItem = ({
  walletType,
  walletInfo,
  connect,
}: {
  walletType: KeyManager
  walletInfo: WalletInfo | null
  connect: (adapter: KeyManager) => void
}) => {
  const greenColor = useColorModeValue('green.500', 'green.200')

  const option = SUPPORTED_WALLETS[walletType]
  // some wallets (e.g. keepkey) do not exist on mobile

  const isSupported = useMemo(() => {
    if (isMobileApp) {
      return ['both', 'app'].includes(String(option.supportsMobile))
    }
    if (isMobile) {
      return ['both', 'browser'].includes(String(option.supportsMobile))
    }
    // Don't display mobile supported wallets on desktop
    return option.supportsMobile !== 'app'
  }, [option.supportsMobile])

  const handleConnect = useCallback(() => connect(walletType), [connect, walletType])

  const isLedgerEnabled = useFeatureFlag('LedgerWallet')

  if (walletType === KeyManager.Ledger && !isLedgerEnabled) return null

  if (!isSupported) return null

  const isPhantomEnabled = getConfig().REACT_APP_FEATURE_PHANTOM_WALLET
  if (walletType === KeyManager.Phantom && !isPhantomEnabled) return null

  const isWalletConnectV2Enabled = getConfig().REACT_APP_FEATURE_WALLET_CONNECT_V2
  if (walletType === KeyManager.WalletConnectV2 && !isWalletConnectV2Enabled) return null

  const Icon = option.icon
  const activeWallet = walletInfo?.name === option.name
  const walletSubText = activeWallet ? 'common.connected' : null

  return (
    <Button
      key={walletType}
      w='full'
      size='md'
      py={8}
      isActive={activeWallet}
      justifyContent='space-between'
      onClick={handleConnect}
      data-test={`connect-wallet-${walletType}-button`}
    >
      <Flex alignItems='flex-start' flexDir='column'>
        <RawText fontWeight='semibold'>{option.name}</RawText>
        <Text fontSize='xs' color='text.subtle' translation={walletSubText} />
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
}

const MipdProviderSelectItem = ({
  walletInfo,
  provider,
  connect,
}: {
  walletInfo: WalletInfo | null
  provider: EIP6963ProviderDetail
  connect: (adapter: string) => void
}) => {
  // There will be a slight bit of accomodating here in web since we don't rely on KeyManager but nothing crazy, (large american) coffee work
  const handleConnect = useCallback(
    () => connect(provider.info.name),
    [connect, provider.info.name],
  )

  const icon = provider.info.icon
  const activeWallet = provider.info.name === walletInfo?.name
  const walletSubText = activeWallet ? 'common.connected' : null

  return (
    <Button
      key={provider.info.name}
      w='full'
      size='md'
      py={8}
      isActive={activeWallet}
      justifyContent='space-between'
      onClick={handleConnect}
      data-test={`connect-wallet-${provider.info.name}-button`}
    >
      <Flex alignItems='flex-start' flexDir='column'>
        <RawText fontWeight='semibold'>{provider.info.name}</RawText>
        <Text fontSize='xs' color='text.subtle' translation={walletSubText} />
      </Flex>
      <Center width='25%'>
        <Image width='24px' height='auto' src={icon} />
      </Center>
    </Button>
  )
}

export const SelectModal = () => {
  const {
    state: { walletInfo },
    connect,
    create,
    importWallet,
  } = useWallet()
  const translate = useTranslate()
  const mipdProviders = useSyncExternalStore(mipdStore.subscribe, mipdStore.getProviders)

  console.log({ mipdProviders })

  const wallets = useMemo(
    () => Object.values(KeyManager).filter(key => key !== KeyManager.Demo),
    [],
  )

  const handleCreate = useCallback(
    () => create(isMobileApp ? KeyManager.Mobile : KeyManager.Native),
    [create],
  )

  const handleImport = useCallback(
    () => importWallet(isMobileApp ? KeyManager.Mobile : KeyManager.Native),
    [importWallet],
  )

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.selectModal.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={6} color='text.subtle' translation={'walletProvider.selectModal.body'} />
        <Text mb={3} color='text.subtle' translation={'Automagically Detected'} />
        <Grid mb={6} gridTemplateColumns={gridTemplateColumnsProp} gridGap={4}>
          {mipdProviders.map(provider => (
            <MipdProviderSelectItem
              key={provider.info.name}
              walletInfo={walletInfo}
              provider={provider}
              connect={name => connect(name as KeyManager, true)}
            />
          ))}
        </Grid>
        <Text mb={3} color='text.subtle' translation={'Others'} />
        <Grid mb={6} gridTemplateColumns={gridTemplateColumnsProp} gridGap={4}>
          {
            // TODO: KeepKey adapter may fail due to the USB interface being in use by another tab
            // So not all of the supported wallets will have an initialized adapter
            wallets.map(walletType => (
              <WalletSelectItem
                key={walletType}
                walletType={walletType}
                walletInfo={walletInfo}
                connect={name => connect(name, true)}
              />
            ))
          }
        </Grid>
        <Flex
          direction={flexDirProp}
          mb={mbProp}
          ml={mlProp}
          mt={2}
          justifyContent='center'
          alignItems='center'
        >
          <Button variant='link' borderTopRadius='none' colorScheme='blue' onClick={handleCreate}>
            {translate('walletProvider.selectModal.create')}
          </Button>
          <Text
            mx={1}
            color='text.subtle'
            colorScheme='blue'
            translation={'walletProvider.selectModal.or'}
          />
          <Button
            mr={1}
            variant='link'
            borderTopRadius='none'
            colorScheme='blue'
            onClick={handleImport}
          >
            {translate('walletProvider.selectModal.import')}
          </Button>
          <Text
            color='text.subtle'
            colorScheme='blue'
            translation={'walletProvider.selectModal.aWallet'}
          />
        </Flex>
      </ModalBody>
    </>
  )
}
