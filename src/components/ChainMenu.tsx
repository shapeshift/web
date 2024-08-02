import { WarningIcon } from '@chakra-ui/icons'
import type { AvatarProps, ButtonProps } from '@chakra-ui/react'
import {
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuGroup,
  MenuItem,
  MenuList,
  Text,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'
import { type ChainId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { CircleIcon } from 'components/Icons/Circle'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'

export type ChainMenuProps<T extends ChainId | 'All'> = {
  chainIds: T[]
  activeChainId: T | undefined
  isActiveChainIdSupported: boolean
  isDisabled: boolean
  buttonProps?: ButtonProps
  disableTooltip?: boolean
  onMenuOptionClick: (chainId: T) => void
}

export const ChainIcon = (props: { chainId: ChainId } & Omit<AvatarProps, 'src' | 'icon'>) => {
  const { chainId, avatarProps } = useMemo(() => {
    const { chainId, ...avatarProps } = props
    return { chainId, avatarProps }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Object.values(props))

  const feeAssetId = useMemo(() => {
    const chainAdapterManager = getChainAdapterManager()
    const adapter = chainAdapterManager.get(chainId)
    const feeAssetId = adapter?.getFeeAssetId()
    return feeAssetId
  }, [chainId])

  if (!feeAssetId) return null

  return <AssetIcon showNetworkIcon assetId={feeAssetId} {...avatarProps} />
}

const ChainMenuItem = <T extends ChainId | 'All'>({
  chainId,
  onClick,
  isConnected,
}: {
  chainId: T
  onClick: (chainId: T) => void
  isConnected: boolean
}) => {
  const { assetIcon, chainName } = useMemo(() => {
    if (chainId === 'All') {
      return {
        chainName: 'All',
        assetIcon: undefined,
      }
    }

    const chainAdapterManager = getChainAdapterManager()
    const adapter = chainAdapterManager.get(chainId)

    return {
      chainName: adapter?.getDisplayName(),
      assetIcon: <ChainIcon chainId={chainId} width='6' height='auto' />,
    }
  }, [chainId])

  const connectedIconColor = useColorModeValue('green.500', 'green.200')
  const connectedChainBgColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.50')

  const handleClick = useCallback(() => onClick(chainId), [chainId, onClick])

  return (
    <MenuItem
      icon={assetIcon}
      backgroundColor={isConnected ? connectedChainBgColor : undefined}
      onClick={handleClick}
      borderRadius='lg'
      m={0}
    >
      <Flex justifyContent={'space-between'} fontSize='md' width='full' alignItems='center'>
        <Text>{chainName}</Text>
        {isConnected && <CircleIcon color={connectedIconColor} w={2} />}
      </Flex>
    </MenuItem>
  )
}

const MenuIcon = <T extends ChainId | 'All'>({
  activeChainId,
  isActiveChainIdSupported,
}: {
  activeChainId?: T
  isActiveChainIdSupported: boolean
}) => {
  const translate = useTranslate()

  if (!activeChainId) {
    return
  }

  if (!isActiveChainIdSupported) {
    return <WarningIcon color='yellow.300' boxSize='4' />
  }

  if (activeChainId === 'All') {
    return translate('common.all')
  }

  return <ChainIcon chainId={activeChainId} width='6' height='auto' />
}

const GenericChainMenu = <T extends ChainId | 'All'>({
  chainIds,
  activeChainId,
  isActiveChainIdSupported,
  onMenuOptionClick,
  isDisabled,
  disableTooltip,
  buttonProps,
}: ChainMenuProps<T>) => {
  const translate = useTranslate()

  return (
    <Menu autoSelect={false}>
      <Tooltip
        label={translate(
          isActiveChainIdSupported ? 'common.switchNetwork' : 'common.unsupportedNetwork',
        )}
        isDisabled={disableTooltip || isDisabled}
      >
        <MenuButton as={Button} {...buttonProps}>
          <Flex alignItems='center' justifyContent='center'>
            <MenuIcon<T>
              activeChainId={activeChainId}
              isActiveChainIdSupported={isActiveChainIdSupported}
            />
          </Flex>
        </MenuButton>
      </Tooltip>

      <MenuList p={2} maxHeight='250px' overflowY='auto' zIndex='dropdown'>
        <MenuGroup title={translate('common.selectNetwork')} ml={3} color='text.subtle'>
          {chainIds.map(chainId => (
            <ChainMenuItem<T>
              isConnected={chainId === activeChainId}
              key={chainId}
              chainId={chainId}
              onClick={onMenuOptionClick}
            />
          ))}
        </MenuGroup>
      </MenuList>
    </Menu>
  )
}

export const ChainMenu = (props: ChainMenuProps<ChainId>) => (
  <GenericChainMenu<ChainId> {...props} />
)
export const AllChainMenu = (props: ChainMenuProps<ChainId | 'All'>) => (
  <GenericChainMenu<ChainId | 'All'> {...props} />
)
