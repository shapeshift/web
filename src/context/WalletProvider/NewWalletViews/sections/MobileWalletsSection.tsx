import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Center,
  Divider,
  Flex,
  Icon,
  Spinner,
  Stack,
  useColorModeValue,
  useMediaQuery,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { FaPlus, FaWallet } from 'react-icons/fa'
import { TbPlus } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { Display } from '@/components/Display'
import { FoxIcon } from '@/components/Icons/FoxIcon'
import { MobileWalletDialogRoutes } from '@/components/MobileWalletDialog/types'
import { RawText, Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { WalletListButton } from '@/context/WalletProvider/components/WalletListButton'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { MobileConfig } from '@/context/WalletProvider/MobileWallet/config'
import { getWallet, listWallets } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'
import type { RevocableWallet } from '@/context/WalletProvider/MobileWallet/RevocableWallet'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { breakpoints } from '@/theme/theme'

const PlusIcon = <TbPlus />

type VaultInfo = {
  id: string
  label: string
}

export type MobileWalletsSectionProps = {
  showHeader?: boolean
}

export const MobileWalletsSection = ({ showHeader = true }: MobileWalletsSectionProps) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const mobileWalletDialog = useModal('mobileWalletDialog')
  const localWallet = useLocalWallet()
  const translate = useTranslate()
  const { getAdapter, dispatch, state } = useWallet()
  const { walletInfo } = state
  const [error, setError] = useState<string | null>(null)
  const [initializingWalletId, setInitializingWalletId] = useState<string | null>(null)
  const bgColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const walletIcon = useMemo(() => <FoxIcon />, [])

  const { isLoading, data: wallets } = useQuery({
    queryKey: ['listWallets'],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    queryFn: async () => {
      try {
        const vaults = await listWallets()
        if (!vaults.length) {
          setError('walletProvider.shapeShift.load.error.noWallet')
          return []
        }
        setError(null)
        return vaults
          .filter((vault): vault is RevocableWallet & { id: string } => vault.id !== undefined)
          .map(vault => ({
            id: vault.id,
            label: vault.label ?? '',
          }))
      } catch (e) {
        console.error('Failed to fetch wallets:', e)
        setError('walletProvider.shapeShift.load.error.fetchingWallets')
        return []
      }
    },
  })

  const handleWalletSelect = useCallback(
    async (wallet: VaultInfo) => {
      setInitializingWalletId(wallet.id)
      const deviceId = wallet.id

      const adapter = await getAdapter(KeyManager.Mobile)

      if (adapter && deviceId) {
        const { name, icon } = MobileConfig

        const revoker: RevocableWallet | null = await (async () => {
          try {
            const walletRevoker = await getWallet(deviceId)
            return walletRevoker
          } catch {
            return null
          }
        })()

        if (!revoker) {
          setInitializingWalletId(null)
          return
        }

        try {
          if (!revoker?.mnemonic) {
            setError('walletProvider.shapeShift.load.error.pair')
            setInitializingWalletId(null)
            return
          }
          if (!revoker?.id) {
            setError('walletProvider.shapeShift.load.error.pair')
            setInitializingWalletId(null)
            return
          }

          const walletInstance = await adapter.pairDevice(revoker.id)
          await walletInstance?.loadDevice({ mnemonic: revoker.mnemonic })
          if (!(await walletInstance?.isInitialized())) {
            await walletInstance?.initialize()
          }

          dispatch({
            type: WalletActions.SET_WALLET,
            payload: {
              wallet: walletInstance,
              name,
              icon,
              deviceId,
              meta: { label: wallet.label },
              connectedType: KeyManager.Mobile,
            },
          })
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
          dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
          dispatch({
            type: WalletActions.SET_CONNECTOR_TYPE,
            payload: { modalType: KeyManager.Mobile, isMipdProvider: false },
          })

          localWallet.setLocalWallet({ type: KeyManager.Mobile, deviceId })
          localWallet.setLocalNativeWalletName(wallet.label ?? 'label')
          revoker.revoke()
        } catch (e) {
          setError('walletProvider.shapeShift.load.error.pair')
        }
      } else {
        setError('walletProvider.shapeShift.load.error.pair')
      }

      setInitializingWalletId(null)
    },
    [dispatch, getAdapter, localWallet],
  )

  const handleAddNewWalletClick = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    mobileWalletDialog.open({ defaultRoute: MobileWalletDialogRoutes.Start })
  }, [dispatch, mobileWalletDialog])

  const walletItems = useMemo(() => {
    if (isLoading || state.isLoadingLocalWallet) {
      return (
        <Center py={6}>
          <Spinner />
        </Center>
      )
    }

    if (error) {
      return (
        <Alert status='error' borderRadius='md'>
          <AlertIcon />
          <AlertDescription>{translate(error)}</AlertDescription>
        </Alert>
      )
    }

    return (wallets ?? []).map(wallet => {
      const isSelected = walletInfo?.deviceId === wallet.id
      const isInitializing = initializingWalletId === wallet.id
      const isDisabled = initializingWalletId !== null && initializingWalletId !== wallet.id

      const handleSelect = () => {
        if (isDisabled) return
        handleWalletSelect(wallet)
      }

      // Mobile/small viewport - use WalletListButton
      if (!isLargerThanMd) {
        return (
          <WalletListButton
            key={wallet.id}
            name={wallet.label}
            icon={walletIcon}
            onSelect={handleSelect}
            isSelected={isSelected}
            isDisabled={isDisabled}
            isLoading={isInitializing}
          />
        )
      }

      // Desktop/large viewport - use compact button
      return (
        <Box
          key={wallet.id}
          as={Button}
          variant='ghost'
          whiteSpace='normal'
          px={4}
          ml='-16px'
          mr='-16px'
          py={2.5}
          borderRadius='md'
          onClick={handleSelect}
          bg={isSelected ? bgColor : undefined}
          isLoading={isInitializing}
          isDisabled={isDisabled}
          opacity={isDisabled ? 0.5 : 1}
          cursor={isDisabled ? 'not-allowed' : 'pointer'}
        >
          <Flex alignItems='center' width='full'>
            <FoxIcon boxSize='24px' mr={3}>
              <FaWallet />
            </FoxIcon>
            <Box textAlign='left'>
              <RawText isTruncated maxW='200px'>
                {wallet.label}
              </RawText>
            </Box>
          </Flex>
        </Box>
      )
    })
  }, [
    wallets,
    handleWalletSelect,
    walletInfo?.deviceId,
    initializingWalletId,
    isLoading,
    state.isLoadingLocalWallet,
    error,
    translate,
    isLargerThanMd,
    bgColor,
    walletIcon,
  ])

  return (
    <>
      {showHeader && (
        <Text
          fontSize='xl'
          fontWeight='semibold'
          translation='walletProvider.shapeShift.onboarding.shapeshiftNative'
        />
      )}
      <Stack spacing={2} my={showHeader ? 6 : 0}>
        {walletItems}

        <Display>
          <Display.Desktop>
            <Box
              as={Button}
              variant='ghost'
              whiteSpace='normal'
              px={4}
              ml='-16px'
              mr='-16px'
              py={2.5}
              borderRadius='md'
              onClick={handleAddNewWalletClick}
            >
              <Flex alignItems='center' width='full' color='gray.500'>
                <Icon as={FaPlus} boxSize='12px' mr={3} />
                <Box textAlign='left'>
                  <Text translation='walletProvider.shapeShift.onboarding.addNewWallet' />
                </Box>
              </Flex>
            </Box>
          </Display.Desktop>
          <Display.Mobile>
            <>
              <WalletListButton
                onSelect={handleAddNewWalletClick}
                isSelected={false}
                isDisabled={false}
                icon={PlusIcon}
                name={translate('walletProvider.shapeShift.onboarding.shapeshiftNative')}
              />
              <Divider my={2} />
            </>
          </Display.Mobile>
        </Display>
      </Stack>
    </>
  )
}
