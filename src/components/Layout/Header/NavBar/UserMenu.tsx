import { ChevronDownIcon, WarningTwoIcon } from '@chakra-ui/icons'
import {
  Button,
  ButtonGroup,
  Flex,
  HStack,
  Menu,
  MenuButton,
  MenuGroup,
  MenuItem,
  MenuList,
  useColorModeValue,
} from '@chakra-ui/react'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { FaWallet } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { MemoryRouter } from 'react-router-dom'
import type { Address } from 'viem'
import { WalletConnectedRoutes } from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'
import { WalletConnectedMenu } from 'components/Layout/Header/NavBar/WalletConnectedMenu'
import { WalletImage } from 'components/Layout/Header/NavBar/WalletImage'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import type { InitialState } from 'context/WalletProvider/WalletProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { viemClient } from 'lib/viem-client'

export const entries = [WalletConnectedRoutes.Connected]

const NoWallet = ({ onClick }: { onClick: () => void }) => {
  const translate = useTranslate()
  return (
    <MenuGroup title={translate('common.noWallet')} ml={3} color='gray.500'>
      <MenuItem onClick={onClick} alignItems='center' justifyContent='space-between'>
        {translate('common.connectWallet')}
        <ChevronDownIcon />
      </MenuItem>
    </MenuGroup>
  )
}

export type WalletConnectedProps = {
  onDisconnect: () => void
  onSwitchProvider: () => void
} & Pick<InitialState, 'walletInfo' | 'isConnected' | 'type'>

export const WalletConnected = (props: WalletConnectedProps) => {
  return (
    <MemoryRouter initialEntries={entries}>
      <WalletConnectedMenu
        isConnected={props.isConnected}
        walletInfo={props.walletInfo}
        onDisconnect={props.onDisconnect}
        onSwitchProvider={props.onSwitchProvider}
        type={props.type}
      />
    </MemoryRouter>
  )
}

type WalletButtonProps = {
  isConnected: boolean
  isDemoWallet: boolean
  isLoadingLocalWallet: boolean
  onConnect: () => void
} & Pick<InitialState, 'walletInfo'>

const WalletButton: FC<WalletButtonProps> = ({
  isConnected,
  isDemoWallet,
  walletInfo,
  onConnect,
  isLoadingLocalWallet,
}) => {
  const [walletLabel, setWalletLabel] = useState('')
  const [shouldShorten, setShouldShorten] = useState(true)
  const bgColor = useColorModeValue('gray.200', 'gray.800')
  const [ensName, setEnsName] = useState<string | null>('')

  useEffect(() => {
    if (!walletInfo?.meta?.address) return
    viemClient.getEnsName({ address: walletInfo.meta.address as Address }).then(setEnsName)
  }, [walletInfo?.meta?.address])

  useEffect(() => {
    setWalletLabel('')
    setShouldShorten(true)
    if (!walletInfo || !walletInfo.meta) return setWalletLabel('')
    // Wallet has a native label, we don't care about ENS name here
    if (!walletInfo?.meta?.address && walletInfo.meta.label) {
      setShouldShorten(false)
      return setWalletLabel(walletInfo.meta.label)
    }

    // ENS is registered for address and is successfully fetched. Set ENS name as label
    if (ensName) {
      setShouldShorten(false)
      return setWalletLabel(ensName!)
    }

    // No label or ENS name, set regular wallet address as label
    return setWalletLabel(walletInfo?.meta?.address ?? '')
  }, [ensName, walletInfo])

  return Boolean(walletInfo?.deviceId) || isLoadingLocalWallet ? (
    <MenuButton
      as={Button}
      width={{ base: '100%', lg: 'auto' }}
      justifyContent='flex-start'
      variant='outline'
      rightIcon={<ChevronDownIcon />}
      leftIcon={
        <HStack>
          {!(isConnected || isDemoWallet) && (
            <WarningTwoIcon ml={2} w={3} h={3} color='yellow.500' />
          )}
          <WalletImage walletInfo={walletInfo} />
        </HStack>
      }
    >
      <Flex>
        {walletLabel ? (
          <MiddleEllipsis
            rounded='lg'
            fontSize='sm'
            p='1'
            pl='2'
            pr='2'
            shouldShorten={shouldShorten}
            bgColor={bgColor}
            value={walletLabel}
          />
        ) : (
          <RawText>{walletInfo?.name}</RawText>
        )}
      </Flex>
    </MenuButton>
  ) : (
    <Button onClick={onConnect} leftIcon={<FaWallet />}>
      <Text translation='common.connectWallet' />
    </Button>
  )
}

export const UserMenu: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const { state, dispatch, disconnect } = useWallet()
  const { isConnected, isDemoWallet, walletInfo, type, isLocked, isLoadingLocalWallet } = state

  if (isLocked) disconnect()
  const hasWallet = Boolean(walletInfo?.deviceId)
  const handleConnect = () => {
    onClick && onClick()
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }
  return (
    <ButtonGroup width='full'>
      <Menu autoSelect={false}>
        <WalletButton
          onConnect={handleConnect}
          walletInfo={walletInfo}
          isConnected={isConnected}
          isDemoWallet={isDemoWallet}
          isLoadingLocalWallet={isLoadingLocalWallet}
          data-test='navigation-wallet-dropdown-button'
        />
        <MenuList
          maxWidth={{ base: 'full', md: 'xs' }}
          minWidth={{ base: 0, md: 'xs' }}
          overflow='hidden'
          // Override zIndex to prevent InputLeftElement displaying over menu
          zIndex={2}
        >
          {hasWallet || isLoadingLocalWallet ? (
            <WalletConnected
              isConnected={isConnected || isDemoWallet}
              walletInfo={walletInfo}
              onDisconnect={disconnect}
              onSwitchProvider={handleConnect}
              type={type}
            />
          ) : (
            <NoWallet onClick={handleConnect} />
          )}
        </MenuList>
      </Menu>
    </ButtonGroup>
  )
}
