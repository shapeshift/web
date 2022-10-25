import { MenuDivider, MenuGroup, MenuItem } from '@chakra-ui/menu'
import { Flex } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { SubMenuContainer } from 'components/Layout/Header/NavBar/SubMenuContainer'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { WalletImage } from 'components/Layout/Header/NavBar/WalletImage'
import { RawText, Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'

export const NativeMenu = () => {
  const translate = useTranslate()
  const {
    state: { walletInfo },
  } = useWallet()
  const { backupNativePassphrase } = useModal()

  return (
    <SubMenuContainer>
      <SubmenuHeader title={translate('common.connectedWalletSettings')} />
      <MenuGroup>
        <Flex px={4} py={2}>
          <WalletImage walletInfo={walletInfo} />
          <Flex flex={1} ml={3} justifyContent='space-between' alignItems='center'>
            <RawText>{walletInfo?.name}</RawText>
          </Flex>
        </Flex>
        <MenuDivider />
        <MenuItem onClick={() => backupNativePassphrase.open({})}>
          <Text translation='modals.shapeShift.backupPassphrase.menuItem' />
        </MenuItem>
      </MenuGroup>
    </SubMenuContainer>
  )
}
