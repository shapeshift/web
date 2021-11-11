import { ChevronRightIcon, CloseIcon, RepeatIcon, TriangleDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Circle,
  FlexProps,
  Menu,
  MenuButton,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuList
} from '@chakra-ui/react'
import { FC } from 'react'
import { Text } from 'components/Text'
import { InitialState, useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'

type WalletImageProps = {
  isConnected: Boolean
} & Pick<InitialState, 'walletInfo'>

const WalletImage = ({ isConnected, walletInfo }: WalletImageProps) => {
  const Icon = walletInfo?.icon
  if (isConnected && Icon) {
    return <Icon width='18px' height='auto' />
  }
  return null
}

export const WalletButton: FC<FlexProps> = () => {
  const { state, dispatch, disconnect } = useWallet()
  const { isConnected, walletInfo } = state

  return !isConnected ? (
    <Button
      onClick={() => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })}
      leftIcon={<WalletImage isConnected={isConnected} walletInfo={walletInfo} />}
      rightIcon={<ChevronRightIcon h={6} w={6} />}
      mr={6}
    >
      <Text translation={'connectWallet.menu.triggerButton'} />
    </Button>
  ) : (
    <Menu gutter={4}>
      <MenuButton
        as={Button}
        leftIcon={<WalletImage isConnected={isConnected} walletInfo={walletInfo} />}
        rightIcon={<TriangleDownIcon h={3} w={3} />}
        mr={6}
      >
        {walletInfo?.name}
      </MenuButton>
      <MenuList minW='300px'>
        <MenuGroup title='Connected'>
          <Box
            borderRadius={0}
            justifyContent='space-between'
            flexDir='row'
            alignItems='center'
            px={4}
            py={2}
            display='flex'
            flexWrap='nowrap'
            icon={<WalletImage isConnected={isConnected} walletInfo={walletInfo} />}
          >
            <Button
              leftIcon={<WalletImage isConnected={isConnected} walletInfo={walletInfo} />}
              bg='whiteAlpha.200'
              borderRadius='lg'
              px={3}
            >
              {walletInfo?.name}
            </Button>
          </Box>
        </MenuGroup>
        <MenuDivider />
        <MenuItem
          icon={
            <Circle bg='whiteAlpha.200' size={8}>
              <RepeatIcon />
            </Circle>
          }
          onClick={() => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })}
        >
          <Text translation={'connectWallet.menu.switchWallet'} />
        </MenuItem>
        <MenuItem
          icon={
            <Circle bg='whiteAlpha.200' size={8}>
              <CloseIcon />
            </Circle>
          }
          onClick={disconnect}
        >
          <Text translation={'connectWallet.menu.disconnect'} />
        </MenuItem>
      </MenuList>
    </Menu>
  )
}
