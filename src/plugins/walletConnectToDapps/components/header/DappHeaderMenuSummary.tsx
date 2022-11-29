import { CloseIcon } from '@chakra-ui/icons'
import { MenuGroup } from '@chakra-ui/menu'
import { Box, HStack, MenuDivider, MenuItem, VStack } from '@chakra-ui/react'
import dayjs from 'dayjs'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import type { FC } from 'react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'

import { DappAvatar } from './DappAvatar'
import { WalletConnectSignClient } from 'kkdesktop/walletconnect/utils'

export const DappHeaderMenuSummary: FC = () => {
  const { supportedEvmChainIds } = useEvm()
  const chainAdapterManager = getChainAdapterManager()

  const translate = useTranslate()

  const walletConnect = useWalletConnect()
  const connectedChainId = walletConnect.legacyBridge?.connector.chainId

  const chainName = useMemo(() => {
    let name = chainAdapterManager
      .get(supportedEvmChainIds.find(chainId => chainId === `eip155:${connectedChainId}`) ?? '')
      ?.getDisplayName()

    if (!name) name = `ChainId ${connectedChainId}`

    return name ?? translate('plugins.walletConnectToDapps.header.menu.unsupportedNetwork')
  }, [chainAdapterManager, connectedChainId, supportedEvmChainIds, translate])

  if (!walletConnect || !walletConnect.dapp) return null

  return (
    <>
      <MenuGroup
        title={translate('plugins.walletConnectToDapps.header.connectedDapp')}
        ml={3}
        color='gray.500'
      >
        <HStack spacing={4} px={3} py={1}>
          <DappAvatar
            name={walletConnect.dapp.name}
            image={walletConnect.dapp.icons[0]}
            connected={walletConnect.legacyBridge?.connector.connected || !!WalletConnectSignClient.session}
          />
          <Box fontWeight='medium'>
            <RawText>{walletConnect.dapp.name}</RawText>
            <RawText fontSize='sm' color='gray.500'>
              {walletConnect.dapp.url.replace(/^https?:\/\//, '')}
            </RawText>
          </Box>
        </HStack>
      </MenuGroup>
      <MenuDivider />

      <VStack px={3} py={1} fontWeight='medium' spacing={1} alignItems='stretch'>
        <HStack justifyContent='space-between' spacing={4}>
          <Text translation='plugins.walletConnectToDapps.header.menu.connected' color='gray.500' />
          <RawText>
            {dayjs(walletConnect.legacyBridge?.connector?.handshakeId / 1000).format(
              'MMM DD, YYYY, HH:mm A',
            )}
          </RawText>
        </HStack>
        <HStack justifyContent='space-between' spacing={4}>
          <Text translation='plugins.walletConnectToDapps.header.menu.address' color='gray.500' />
          {!!walletConnect?.legacyBridge?.connector?.accounts && (
            <MiddleEllipsis
              value={walletConnect?.legacyBridge?.connector?.accounts[0]}
              color='blue.200'
            />
          )}
        </HStack>
        {walletConnect?.legacyBridge?.connector?.connected && (
          <HStack justifyContent='space-between' spacing={4}>
            <Text translation='plugins.walletConnectToDapps.header.menu.network' color='gray.500' />
            <RawText>{chainName}</RawText>
          </HStack>
        )}
      </VStack>

      <MenuDivider />
      <MenuItem
        fontWeight='medium'
        icon={<CloseIcon />}
        onClick={walletConnect?.legacyBridge?.disconnect}
        color='red.500'
      >
        {translate('plugins.walletConnectToDapps.header.menu.disconnect')}
      </MenuItem>
    </>
  )
}
