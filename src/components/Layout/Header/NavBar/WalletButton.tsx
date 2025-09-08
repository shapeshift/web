import { ChevronDownIcon, WarningTwoIcon } from '@chakra-ui/icons'
import type { ButtonProps } from '@chakra-ui/react'
import { Button, Flex, HStack, MenuButton } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaWallet } from 'react-icons/fa'
import { getAddress } from 'viem'
import { useEnsName } from 'wagmi'

import { WalletConnectedRoutes } from '@/components/Layout/Header/NavBar/hooks/useMenuRoutes'
import { WalletImage } from '@/components/Layout/Header/NavBar/WalletImage'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from '@/components/Text'
import type { InitialState } from '@/context/WalletProvider/WalletProvider'
import { useMipdProviders } from '@/lib/mipd'
import { vibrate } from '@/lib/vibrate'
import { selectWalletRdns } from '@/state/slices/localWalletSlice/selectors'
import { useAppSelector } from '@/state/store'

export const entries = [WalletConnectedRoutes.Connected]

const widthProp = { base: '100%', lg: 'auto' }
const connectButtonHoverSx = { bg: 'background.surface.elevated', borderColor: 'border.hover' }

type WalletButtonProps = {
  isMenuContext?: boolean
  isConnected: boolean
  isLoadingLocalWallet: boolean
  onConnect: () => void
} & Pick<InitialState, 'walletInfo'> &
  ButtonProps

export const WalletButton: FC<WalletButtonProps> = ({
  isMenuContext = false,
  isConnected,
  walletInfo,
  onConnect,
  isLoadingLocalWallet,
  ...otherProps
}) => {
  const [walletLabel, setWalletLabel] = useState('')
  const [shouldShorten, setShouldShorten] = useState(true)

  const { data: ensName } = useEnsName({
    address: walletInfo?.meta?.address ? getAddress(walletInfo.meta.address) : undefined,
  })

  const maybeRdns = useAppSelector(selectWalletRdns)

  const mipdProviders = useMipdProviders()
  const maybeMipdProvider = useMemo(
    () => mipdProviders.find(provider => provider.info.rdns === maybeRdns),
    [mipdProviders, maybeRdns],
  )

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
      return setWalletLabel(ensName)
    }

    // No label or ENS name, set regular wallet address as label
    return setWalletLabel(walletInfo?.meta?.address ?? '')
  }, [ensName, walletInfo])

  const rightIcon = useMemo(() => <ChevronDownIcon />, [])
  const leftIcon = useMemo(
    () => (
      <HStack>
        {!isConnected && <WarningTwoIcon ml={2} w={3} h={3} color='yellow.500' />}
        <WalletImage walletInfo={maybeMipdProvider?.info || walletInfo} />
      </HStack>
    ),
    [isConnected, maybeMipdProvider, walletInfo],
  )
  const connectIcon = useMemo(() => <FaWallet />, [])

  const handleMenuClick = useCallback(() => {
    vibrate('heavy')
  }, [])

  const ButtonComp = isMenuContext ? MenuButton : Button

  return Boolean(walletInfo?.deviceId) || isLoadingLocalWallet ? (
    <ButtonComp
      as={Button}
      width={widthProp}
      justifyContent='flex-start'
      rightIcon={rightIcon}
      leftIcon={leftIcon}
      onClick={handleMenuClick}
      size='md'
      fontSize='sm'
      variant='ghost'
      bg='transparent'
      {...otherProps}
    >
      <Flex>
        {walletLabel ? (
          <MiddleEllipsis fontSize='sm' shouldShorten={shouldShorten} value={walletLabel} />
        ) : (
          <RawText>{walletInfo?.name}</RawText>
        )}
      </Flex>
    </ButtonComp>
  ) : (
    <Button
      onClick={onConnect}
      leftIcon={connectIcon}
      size='md'
      fontSize='sm'
      bg='background.surface.base'
      border='1px solid'
      borderColor='border.base'
      _hover={connectButtonHoverSx}
    >
      <Text translation='common.connectWallet' />
    </Button>
  )
}
