import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  CloseIcon,
  CopyIcon,
  RepeatIcon,
  TriangleDownIcon
} from '@chakra-ui/icons'
import {
  Box,
  Button,
  Circle,
  FlexProps,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuList,
  Tooltip
} from '@chakra-ui/react'
import { InitialState, useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { FC } from 'react'

type WalletImageProps = {
  isConnected: Boolean
} & Pick<InitialState, 'walletInfo'>

const WalletImage: React.FC<WalletImageProps> = ({ isConnected, walletInfo }) => {
  const Icon = walletInfo?.icon
  if (isConnected && Icon) {
    return <Icon width='30px' height='auto' />
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
      Connect Wallet
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
            <HStack ml={4}>
              <Tooltip label='Send'>
                <IconButton size='sm' icon={<ArrowUpIcon />} aria-label='Send' isRound />
              </Tooltip>
              <Tooltip label='Receive'>
                <IconButton size='sm' icon={<ArrowDownIcon />} aria-label='Receive' isRound />
              </Tooltip>
              <Tooltip label='Copy Address'>
                <IconButton size='sm' icon={<CopyIcon />} aria-label='Copy Address' isRound />
              </Tooltip>
            </HStack>
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
          Switch Wallet Provider
        </MenuItem>
        <MenuItem
          icon={
            <Circle bg='whiteAlpha.200' size={8}>
              <CloseIcon />
            </Circle>
          }
          onClick={disconnect}
        >
          Disconnect
        </MenuItem>
      </MenuList>
    </Menu>
  )
}
