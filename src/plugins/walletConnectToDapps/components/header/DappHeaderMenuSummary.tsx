import { CloseIcon } from '@chakra-ui/icons'
import { Box, HStack, Link, MenuDivider, MenuGroup, MenuItem, VStack } from '@chakra-ui/react'
import dayjs from 'dayjs'
import { useWalletConnect } from 'plugins/walletConnectToDapps/v1/WalletConnectBridgeContext'
import { useTranslate } from 'react-polyglot'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DappAvatar } from './DappAvatar'

export const DappHeaderMenuSummary = () => {
  const selectedLocale = useAppSelector(selectSelectedLocale)

  const translate = useTranslate()

  const walletConnect = useWalletConnect()
  const connectedEvmChainId = walletConnect.connector?.chainId

  const handleDisconnect = walletConnect.disconnect

  // 0x evm address
  const connectedAccountAddress = walletConnect?.connector?.accounts[0] ?? ''

  if (!walletConnect.connector || !walletConnect.dapp) return null

  return (
    <>
      <MenuGroup
        title={translate('plugins.walletConnectToDapps.header.connectedDapp')}
        ml={3}
        color='text.subtle'
      >
        <HStack spacing={4} px={3} py={1}>
          <DappAvatar
            name={walletConnect.dapp.name}
            image={walletConnect.dapp.icons?.[0]}
            connected={walletConnect.connector?.connected}
          />
          <Box fontWeight='medium'>
            <RawText maxWidth='215px' overflow='hidden' textOverflow='ellipsis' whiteSpace='nowrap'>
              {walletConnect.dapp.name}
            </RawText>
            <RawText
              fontSize='sm'
              color='text.subtle'
              maxWidth='215px'
              overflow='hidden'
              textOverflow='ellipsis'
              whiteSpace='nowrap'
            >
              {walletConnect.dapp.url.replace(/^https?:\/\//, '')}
            </RawText>
          </Box>
        </HStack>
      </MenuGroup>
      <MenuDivider />

      <VStack px={3} py={1} fontWeight='medium' spacing={1} alignItems='stretch'>
        <HStack justifyContent='space-between' spacing={4}>
          <Text
            translation='plugins.walletConnectToDapps.header.menu.connected'
            color='text.subtle'
          />
          <RawText>
            {dayjs(walletConnect.connector?.handshakeId / 1000)
              .locale(selectedLocale)
              .format('ll LT')}
          </RawText>
        </HStack>
        <HStack justifyContent='space-between' spacing={4}>
          <Text
            translation='plugins.walletConnectToDapps.header.menu.address'
            color='text.subtle'
          />
          <Link
            href={`${walletConnect.accountExplorerAddressLink}${connectedAccountAddress}`}
            isExternal
          >
            <MiddleEllipsis value={connectedAccountAddress} color='blue.200' />
          </Link>
        </HStack>
        {!!connectedEvmChainId && (
          <HStack justifyContent='space-between' spacing={4}>
            <Text
              translation='plugins.walletConnectToDapps.header.menu.network'
              color='text.subtle'
            />
            <RawText>{walletConnect.chainName}</RawText>
          </HStack>
        )}
      </VStack>

      <MenuDivider />
      <MenuItem fontWeight='medium' icon={<CloseIcon />} onClick={handleDisconnect} color='red.500'>
        {translate('plugins.walletConnectToDapps.header.menu.disconnect')}
      </MenuItem>
    </>
  )
}
