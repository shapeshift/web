import { WarningIcon } from '@chakra-ui/icons'
import type { ButtonProps } from '@chakra-ui/react'
import {
  Box,
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
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type ChainMenuProps<T extends string> = {
  chainIds: T[]
  activeChainId: T | undefined
  isActiveChainIdSupported: boolean
  isDisabled: boolean
  buttonProps?: ButtonProps
  onMenuOptionClick: (chainId: ChainId) => void
}

const ChainMenuItem: React.FC<{
  chainId: ChainId
  onClick: (chainId: ChainId) => void
  isConnected: boolean
}> = ({ chainId, onClick, isConnected }) => {
  const { nativeAssetId, chainName } = useMemo(() => {
    const chainAdapterManager = getChainAdapterManager()
    const adapter = chainAdapterManager.get(chainId)
    return { chainName: adapter?.getDisplayName(), nativeAssetId: adapter?.getFeeAssetId() }
  }, [chainId])

  const nativeAsset = useAppSelector(state => selectAssetById(state, nativeAssetId ?? ''))
  const connectedIconColor = useColorModeValue('green.500', 'green.200')
  const connectedChainBgColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.50')
  const assetIcon = useMemo(
    () => <AssetIcon assetId={nativeAssetId} showNetworkIcon width='6' height='auto' />,
    [nativeAssetId],
  )
  const handleClick = useCallback(() => onClick(chainId), [chainId, onClick])

  if (!nativeAsset) return null

  return (
    <MenuItem
      icon={assetIcon}
      backgroundColor={isConnected ? connectedChainBgColor : undefined}
      onClick={handleClick}
      borderRadius='lg'
    >
      <Flex justifyContent={'space-between'}>
        <Text>{chainName}</Text>
        <Box>{isConnected && <CircleIcon color={connectedIconColor} w={2} />}</Box>
      </Flex>
    </MenuItem>
  )
}

export const ChainMenu = <T extends string>({
  chainIds,
  activeChainId,
  isActiveChainIdSupported,
  onMenuOptionClick,
  isDisabled,
  buttonProps,
}: ChainMenuProps<T>) => {
  const translate = useTranslate()

  const activeChainFeeAssetId = useMemo(() => {
    const chainAdapterManager = getChainAdapterManager()
    return chainAdapterManager.get(activeChainId ?? '')?.getFeeAssetId()
  }, [activeChainId])

  return (
    <Menu autoSelect={false}>
      <Tooltip
        label={translate(
          isActiveChainIdSupported ? 'common.switchNetwork' : 'common.unsupportedNetwork',
        )}
        isDisabled={isDisabled}
      >
        <MenuButton as={Button} {...buttonProps}>
          <Flex alignItems='center' justifyContent='center'>
            {isActiveChainIdSupported ? (
              <AssetIcon assetId={activeChainFeeAssetId} showNetworkIcon size='xs' />
            ) : (
              <WarningIcon color='yellow.300' boxSize='4' />
            )}
          </Flex>
        </MenuButton>
      </Tooltip>

      <MenuList p='10px' zIndex={2}>
        <MenuGroup title={translate('common.selectNetwork')} ml={3} color='text.subtle'>
          {chainIds.map(chainId => (
            <ChainMenuItem
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
