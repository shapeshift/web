import { ChevronDownIcon, ChevronRightIcon, CloseIcon, RepeatIcon } from '@chakra-ui/icons'
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

type WalletImageProps = Pick<InitialState, 'walletInfo'>

export const WalletImage = ({ walletInfo }: WalletImageProps) => {
  const Icon = walletInfo?.icon
  if (Icon) {
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
      leftIcon={<WalletImage walletInfo={walletInfo} />}
      rightIcon={<ChevronRightIcon h={6} w={6} />}
      variant='ghost-filled'
      colorScheme='blue'
      mr={6}
    >
      <Text translation={'connectWallet.menu.triggerButton'} />
    </Button>
  ) : (
    <Menu>
      <MenuButton
        as={Button}
        variant='ghost'
        leftIcon={<WalletImage walletInfo={walletInfo} />}
        rightIcon={<ChevronDownIcon />}
        colorScheme='green'
        mr={6}
        disabled
      >
        {walletInfo?.name}
      </MenuButton>
      <MenuList>
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
            icon={<WalletImage walletInfo={walletInfo} />}
          >
            <Button
              leftIcon={<WalletImage walletInfo={walletInfo} />}
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
