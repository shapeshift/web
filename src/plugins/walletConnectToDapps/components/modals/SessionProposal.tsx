import { ArrowBackIcon, ChevronDownIcon, ChevronLeftIcon, InfoIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Circle,
  Flex,
  HStack,
  IconButton,
  Image,
  Radio,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { ProposalTypes, SessionTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { mergeWith, uniq } from 'lodash'
import type { JSX } from 'react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { TbPlug } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from '@/components/Text'
import { knownChainIds } from '@/constants/chains'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { walletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'
import { assertIsDefined } from '@/lib/utils'
import { ModalSection } from '@/plugins/walletConnectToDapps/components/modals/ModalSection'
import { Permissions } from '@/plugins/walletConnectToDapps/components/Permissions'
import type { SessionProposalRef } from '@/plugins/walletConnectToDapps/types'
import { EIP155_SigningMethod, WalletConnectActionType } from '@/plugins/walletConnectToDapps/types'
import type { WalletConnectSessionModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'
import {
  selectAccountIdsByChainId,
  selectAssets,
  selectWalletEnabledAccountIds,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const disabledProp = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }

type SessionProposalStep = 'main' | 'choose-account' | 'choose-network'

type SessionProposalMainScreenProps = {
  modalBody: JSX.Element
  selectedAddress: string | null
  uniqueEvmAddresses: string[]
  selectedNetworks: string[]
  onAccountClick: () => void
  onNetworkClick: () => void
  onConnectAll: () => void
  onConnectSelected: () => void
  onReject: () => void
  isLoading: boolean
  canConnect: boolean
  translate: (key: string) => string
}

const SessionProposalMainScreen: React.FC<SessionProposalMainScreenProps> = ({
  modalBody,
  selectedAddress,
  uniqueEvmAddresses,
  selectedNetworks,
  onAccountClick,
  onNetworkClick,
  onConnectAll,
  onConnectSelected,
  onReject,
  isLoading,
  canConnect,
  translate,
}) => {
  const assetsById = useAppSelector(selectAssets)
  const chainAdapterManager = getChainAdapterManager()
  const borderColor = useColorModeValue('gray.100', 'rgba(255, 255, 255, 0.08)')

  const chainData = useMemo(() => {
    return selectedNetworks
      .map(chainId => {
        const feeAssetId = chainAdapterManager.get(chainId)?.getFeeAssetId()
        const feeAsset = feeAssetId ? assetsById[feeAssetId] : undefined

        return {
          chainId,
          icon: feeAsset?.networkIcon ?? feeAsset?.icon,
          name: chainAdapterManager.get(chainId)?.getDisplayName() ?? chainId,
        }
      })
      .filter(chain => chain.icon)
  }, [selectedNetworks, assetsById, chainAdapterManager])

  if (!selectedAddress) return <>{modalBody}</>

  const hasMultipleAddresses = uniqueEvmAddresses.length > 1
  const maxVisibleChains = 4
  const visibleChains = chainData.slice(0, maxVisibleChains)
  const remainingCount = chainData.length - maxVisibleChains

  return (
    <>
      {modalBody}

      {/* Connection Request Section */}
      <HStack
        spacing={3}
        align='center'
        w='full'
        justify='space-between'
        py={3}
        px={4}
        bg='rgba(0, 181, 216, 0.1)'
        borderRadius='9999px'
      >
        <HStack spacing={2} align='center'>
          <TbPlug size={14} color='rgb(0, 181, 216)' />
          <RawText fontSize='sm' color='rgb(0, 181, 216)' fontWeight='normal'>
            Connection Request
          </RawText>
        </HStack>
        <InfoIcon boxSize={3.5} color='rgb(0, 181, 216)' />
      </HStack>

      <Box
        bg='transparent'
        borderTopRadius='24px'
        borderTop='1px solid'
        borderLeft='1px solid'
        borderRight='1px solid'
        borderColor={borderColor}
        px={8}
        py={4}
        mx={-6}
        mb={-6}
        mt={4}
      >
        <VStack spacing={4}>
          <HStack spacing={4} w='full' justify='space-between' align='center'>
            {/* Left: Address with identicon */}
            <VStack spacing={1} align='start' flex={1}>
              <RawText fontSize='xs' color='text.subtle' fontWeight='medium'>
                {translate('plugins.walletConnectToDapps.modal.connectWith')}
              </RawText>
              <HStack
                spacing={3}
                align='center'
                cursor={hasMultipleAddresses ? 'pointer' : 'default'}
                onClick={hasMultipleAddresses ? onAccountClick : undefined}
                _hover={hasMultipleAddresses ? { opacity: 0.8 } : undefined}
              >
                <Image src={makeBlockiesUrl(selectedAddress)} boxSize='32px' borderRadius='full' />
                <MiddleEllipsis value={selectedAddress} fontSize='sm' fontWeight='medium' />
                {hasMultipleAddresses && <ChevronDownIcon color='text.subtle' boxSize={3} />}
              </HStack>
            </VStack>

            {/* Right: Networks */}
            <HStack
              spacing={2}
              align='center'
              cursor='pointer'
              onClick={onNetworkClick}
              _hover={{ opacity: 0.8 }}
            >
              <VStack spacing={1} align='center'>
                <RawText fontSize='xs' color='text.subtle' fontWeight='medium'>
                  Networks
                </RawText>
                <Flex align='center'>
                  {visibleChains.map((chain, index) => (
                    <Box key={chain.chainId} ml={index === 0 ? 0 : -1.5} zIndex={index}>
                      <LazyLoadAvatar boxSize={5} src={chain.icon} />
                    </Box>
                  ))}
                  {remainingCount > 0 && (
                    <Circle
                      size={5}
                      bg='gray.100'
                      _dark={{ bg: 'gray.700' }}
                      color='text.base'
                      fontSize='2xs'
                      fontWeight='medium'
                      ml={-1.5}
                      zIndex={visibleChains.length}
                    >
                      +{remainingCount}
                    </Circle>
                  )}
                </Flex>
              </VStack>
              <ChevronDownIcon color='text.subtle' boxSize={3} />
            </HStack>
          </HStack>

          <HStack spacing={4} w='full'>
            <Button
              size='lg'
              flex={1}
              onClick={onReject}
              isDisabled={isLoading}
              _disabled={disabledProp}
            >
              {translate('plugins.walletConnectToDapps.modal.signMessage.reject')}
            </Button>
            <Button
              size='lg'
              flex={1}
              colorScheme='blue'
              type='submit'
              onClick={onConnectSelected}
              isDisabled={!canConnect}
              _disabled={disabledProp}
              isLoading={isLoading}
            >
              {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
            </Button>
          </HStack>
        </VStack>
      </Box>
    </>
  )
}

const checkAllNamespacesHaveAccounts = (
  namespaces: ProposalTypes.RequiredNamespaces | ProposalTypes.OptionalNamespaces,
  selectedAccountIds: AccountId[],
): boolean => {
  return Object.values(namespaces).every(
    namespace =>
      namespace.chains?.every(requiredChainId =>
        selectedAccountIds.some(accountId => {
          const { chainId: accountChainId } = fromAccountId(accountId)
          return requiredChainId === accountChainId
        }),
      ),
  )
}

const _createApprovalNamespaces = (
  proposalNamespaces: ProposalTypes.RequiredNamespaces | ProposalTypes.OptionalNamespaces,
  selectedAccounts: string[],
): SessionTypes.Namespaces => {
  return Object.entries(proposalNamespaces).reduce(
    (namespaces: SessionTypes.Namespaces, [key, proposalNamespace]) => {
      const selectedAccountsForKey = selectedAccounts.filter(accountId => {
        const { chainNamespace } = fromAccountId(accountId)
        return chainNamespace === key
      })

      // That condition seems useless at runtime since we *currently* only handle eip155
      // but technically, we *do* support Cosmos SDK
      const methods =
        key === 'eip155'
          ? Object.values(EIP155_SigningMethod).filter(
              // Not required, and will currently will fail in wc land
              method => method !== EIP155_SigningMethod.GET_CAPABILITIES,
            )
          : proposalNamespace.methods

      namespaces[key] = {
        accounts: selectedAccountsForKey,
        methods,
        events: proposalNamespace.events,
      }
      return namespaces
    },
    {},
  )
}

const createApprovalNamespaces = (
  requiredNamespaces: ProposalTypes.RequiredNamespaces,
  optionalNamespaces: ProposalTypes.OptionalNamespaces,
  selectedAccounts: string[],
): SessionTypes.Namespaces => {
  // tell lodash to concat array but merge everything else
  const concatArrays = (objValue: unknown, srcValue: unknown) => {
    if (Array.isArray(objValue) && Array.isArray(srcValue)) {
      return Array.from(new Set([...objValue, ...srcValue]))
    }
  }

  // do a deep merge of the optional and required namespace approval objects
  // but with a concat for the arrays so values stored on the same index aren't overwritten
  return mergeWith(
    _createApprovalNamespaces(requiredNamespaces, selectedAccounts),
    _createApprovalNamespaces(optionalNamespaces, selectedAccounts),
    concatArrays,
  )
}

const SessionProposal = forwardRef<SessionProposalRef, WalletConnectSessionModalProps>(
  (
    {
      onClose: handleClose,
      state: {
        modalData: { proposal },
        web3wallet,
      },
      dispatch,
    }: WalletConnectSessionModalProps,
    ref,
  ) => {
    assertIsDefined(proposal)

    const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)
    const portfolioAccountIds = useAppSelector(selectWalletEnabledAccountIds)

    const wallet = useWallet().state.wallet
    const translate = useTranslate()

    const { id, params } = proposal
    const { proposer, requiredNamespaces, optionalNamespaces } = params

    console.log({ params })

    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [selectedAccountIds, setSelectedAccountIds] = useState<AccountId[]>([])

    // New state management for redesigned flow
    const [newSelectedAccountIds, setNewSelectedAccountIds] = useState<AccountId[]>([])
    const [currentStep, setCurrentStep] = useState<SessionProposalStep>('main')
    const [selectedChainIds, setSelectedChainIds] = useState<string[]>([])

    // Derived values for display (AccountIds as source of truth)
    const selectedAddress = useMemo(() => {
      const address =
        newSelectedAccountIds.length > 0 ? fromAccountId(newSelectedAccountIds[0]).account : null
      return address
    }, [newSelectedAccountIds])

    const selectedNetworks = useMemo(() => {
      const networks = uniq(newSelectedAccountIds.map(id => fromAccountId(id).chainId))
      console.log('🌐 Selected networks:', networks)
      return networks
    }, [newSelectedAccountIds])

    const uniqueEvmAddresses = useMemo(() => {
      const evmAccountIds = portfolioAccountIds.filter(
        id => fromAccountId(id).chainNamespace === 'eip155',
      )
      const addresses = uniq(evmAccountIds.map(id => fromAccountId(id).account))
      console.log('👤 Unique EVM addresses:', addresses)
      console.log(
        '📊 Total enabled accounts:',
        portfolioAccountIds.length,
        'EVM accounts:',
        evmAccountIds.length,
      )
      return addresses
    }, [portfolioAccountIds])

    const evmAccountIdsByAddress = useMemo(() => {
      const evmAccountIds = portfolioAccountIds.filter(
        id => fromAccountId(id).chainNamespace === 'eip155',
      )
      const addressMap: Record<string, AccountId[]> = {}
      evmAccountIds.forEach(id => {
        const address = fromAccountId(id).account
        if (!addressMap[address]) addressMap[address] = []
        addressMap[address].push(id)
      })
      console.log('🗺️  EVM addresses to AccountIds mapping:', addressMap)
      return addressMap
    }, [portfolioAccountIds])

    const assetsById = useAppSelector(selectAssets)

    // Get required chains from the proposal
    const requiredChainIds = useMemo(() => {
      return Object.values(requiredNamespaces).flatMap(namespace => namespace.chains ?? [])
    }, [requiredNamespaces])

    // Get all EVM chains including those user doesn't have accounts for
    const allEvmChainData = useMemo(() => {
      const chainAdapterManager = getChainAdapterManager()

      // Get all required and optional EVM chains from the proposal
      const proposalChainIds = [
        ...Object.values(requiredNamespaces).flatMap(namespace => namespace.chains ?? []),
        ...Object.values(optionalNamespaces).flatMap(namespace => namespace.chains ?? []),
      ].filter(chainId => chainId.startsWith('eip155:'))

      // Also include chains user has accounts for
      const userChainIds = selectedAddress
        ? uniq((evmAccountIdsByAddress[selectedAddress] || []).map(id => fromAccountId(id).chainId))
        : []

      const allChainIds = uniq([...proposalChainIds, ...userChainIds])

      const chainData = allChainIds
        .map(chainId => {
          const feeAssetId = chainAdapterManager.get(chainId)?.getFeeAssetId()
          const feeAsset = feeAssetId ? assetsById[feeAssetId] : undefined
          const hasAccount = selectedAddress
            ? (evmAccountIdsByAddress[selectedAddress] || []).some(
                id => fromAccountId(id).chainId === chainId,
              )
            : false

          return {
            chainId,
            icon: feeAsset?.networkIcon ?? feeAsset?.icon,
            name: chainAdapterManager.get(chainId)?.getDisplayName() ?? chainId,
            hasAccount,
          }
        })
        .filter(chain => chain.icon)

      // Sort: required first, then optional
      return chainData.sort((a, b) => {
        const aRequired = requiredChainIds.includes(a.chainId)
        const bRequired = requiredChainIds.includes(b.chainId)
        if (aRequired && !bRequired) return -1
        if (!aRequired && bRequired) return 1
        return a.name.localeCompare(b.name)
      })
    }, [
      selectedAddress,
      evmAccountIdsByAddress,
      assetsById,
      requiredNamespaces,
      optionalNamespaces,
      requiredChainIds,
    ])

    // Auto-initialize with first address + all available networks
    useEffect(() => {
      if (uniqueEvmAddresses.length > 0 && newSelectedAccountIds.length === 0) {
        const firstAddress = uniqueEvmAddresses[0]
        const allAccountIdsForAddress = portfolioAccountIds.filter(id => {
          const { account, chainNamespace } = fromAccountId(id)
          return chainNamespace === 'eip155' && account === firstAddress
        })
        console.log('🚀 Auto-initializing with:', {
          firstAddress,
          accountIds: allAccountIdsForAddress,
        })
        setNewSelectedAccountIds(allAccountIdsForAddress)

        // Initialize selected chains with all available chains + required chains
        const chainIds = uniq(allAccountIdsForAddress.map(id => fromAccountId(id).chainId))
        const requiredChains = Object.values(requiredNamespaces).flatMap(
          namespace => namespace.chains ?? [],
        )
        const allSelectedChains = uniq([...chainIds, ...requiredChains])
        setSelectedChainIds(allSelectedChains)
      }
    }, [uniqueEvmAddresses, portfolioAccountIds, newSelectedAccountIds.length])

    // Update newSelectedAccountIds when selectedChainIds changes
    useEffect(() => {
      if (selectedAddress && selectedChainIds.length > 0) {
        const addressAccountIds = evmAccountIdsByAddress[selectedAddress] || []
        const filteredAccountIds = addressAccountIds.filter(id => {
          const chainId = fromAccountId(id).chainId
          return selectedChainIds.includes(chainId)
        })
        setNewSelectedAccountIds(filteredAccountIds)
        console.log('🔗 Updated AccountIds based on selected chains:', filteredAccountIds)
      }
    }, [selectedChainIds, selectedAddress, evmAccountIdsByAddress])

    // Debug current step
    useEffect(() => {
      console.log('📍 Current step:', currentStep)
    }, [currentStep])

    // Navigation handlers
    const handleAccountClick = useCallback(() => {
      console.log('🔄 Navigating to choose-account')
      setCurrentStep('choose-account')
    }, [])

    const handleNetworkClick = useCallback(() => {
      console.log('🔄 Navigating to choose-network')
      setCurrentStep('choose-network')
    }, [])

    console.log({ requiredChainIds })

    const toggleChainId = useCallback(
      (chainId: string) => {
        const isRequired = requiredChainIds.includes(chainId)
        if (isRequired) return // Don't allow toggling required chains

        setSelectedChainIds(prev => {
          if (prev.includes(chainId)) {
            return prev.filter(id => id !== chainId)
          } else {
            return [...prev, chainId]
          }
        })
      },
      [requiredChainIds],
    )

    const handleSelectAllChains = useCallback(() => {
      const allSelectableChainIds = allEvmChainData
        .filter(chain => chain.hasAccount)
        .map(chain => chain.chainId)
      setSelectedChainIds(allSelectableChainIds)
    }, [allEvmChainData])

    const toggleAccountId = useCallback((accountId: string) => {
      setSelectedAccountIds(previousState =>
        previousState.includes(accountId)
          ? previousState.filter(existingAccountId => existingAccountId !== accountId)
          : [...previousState, accountId],
      )
    }, [])

    const checkAllNamespacesSupported = useCallback(
      (
        namespaces: ProposalTypes.RequiredNamespaces | ProposalTypes.OptionalNamespaces,
        wallet: HDWallet | null,
      ): boolean =>
        Object.values(namespaces).every(
          namespace =>
            namespace.chains?.every(chainId => {
              return walletSupportsChain({
                chainId,
                wallet,
                isSnapInstalled: false,
                checkConnectedAccountIds: accountIdsByChainId[chainId] ?? [],
              })
            }),
        ),
      [accountIdsByChainId],
    )

    /*
  We need to pass an account for every supported namespace. If we can't, we cannot approve the session.
  https://docs.walletconnect.com/2.0/specs/clients/sign/session-namespaces#21-session-namespaces-must-not-have-accounts-empty
   */
    const allNamespacesSupported = useMemo(() => {
      const allRequiredNamespacesSupported = checkAllNamespacesSupported(requiredNamespaces, wallet)
      return allRequiredNamespacesSupported
    }, [checkAllNamespacesSupported, requiredNamespaces, wallet])

    /*
  All namespaces require at least one account in the response payload
  https://docs.walletconnect.com/2.0/specs/clients/sign/session-namespaces#24-session-namespaces-must-contain-at-least-one-account-in-requested-chains
   */
    const allNamespacesHaveAccounts = useMemo(() => {
      const allRequiredNamespacesHaveAccounts = checkAllNamespacesHaveAccounts(
        requiredNamespaces,
        selectedAccountIds,
      )
      return allRequiredNamespacesHaveAccounts
    }, [requiredNamespaces, selectedAccountIds])

    const supportedOptionalNamespacesWithAccounts = useMemo(() => {
      return Object.fromEntries(
        Object.entries(optionalNamespaces)
          .map(([key, namespace]): [string, ProposalTypes.BaseRequiredNamespace] => {
            namespace.chains = namespace.chains?.filter(chainId => {
              const chainAccountIds = accountIdsByChainId[chainId] ?? []
              const isRequired = requiredNamespaces[key]?.chains?.includes(chainId)
              const isSupported =
                knownChainIds.includes(chainId as KnownChainIds) &&
                walletSupportsChain({
                  chainId,
                  wallet,
                  isSnapInstalled: false,
                  checkConnectedAccountIds: chainAccountIds,
                })
              return !isRequired && isSupported
            })

            return [key, namespace]
          })
          .filter(([_key, namespace]) => {
            return namespace.chains && namespace.chains.length > 0
          }),
      )
    }, [accountIdsByChainId, optionalNamespaces, requiredNamespaces, wallet])

    const handleConnectAccountIds = useCallback(
      async (_selectedAccountIds: AccountId[]) => {
        // First check if proposal is still valid
        const pendingProposals = web3wallet.getPendingSessionProposals()
        const isProposalValid = Object.values(pendingProposals).some(
          pendingProposal => pendingProposal.id === proposal.id,
        )

        if (!isProposalValid) {
          return
        }

        const approvalNamespaces: SessionTypes.Namespaces = createApprovalNamespaces(
          requiredNamespaces,
          optionalNamespaces,
          _selectedAccountIds,
        )

        setIsLoading(true)

        const session = await web3wallet.approveSession({
          id: proposal.id,
          namespaces: approvalNamespaces,
        })
        dispatch({ type: WalletConnectActionType.ADD_SESSION, payload: session })
        handleClose()
      },
      [dispatch, handleClose, proposal, web3wallet, optionalNamespaces, requiredNamespaces],
    )

    const handleConnectSelectedAccountIds = useCallback(
      () => handleConnectAccountIds(selectedAccountIds),
      [handleConnectAccountIds, selectedAccountIds],
    )

    const handleConnectAll = useCallback(() => {
      const requiredNamespacesChainIds = Object.values(requiredNamespaces).flatMap(
        namespace => namespace.chains ?? [],
      )
      const optionalNamespacesChainIds = Object.values(
        supportedOptionalNamespacesWithAccounts,
      ).flatMap(namespace => namespace.chains ?? [])

      const namespacesChainIds = [...requiredNamespacesChainIds, ...optionalNamespacesChainIds]

      const filteredAccountIds = portfolioAccountIds.filter(accountId => {
        const chainId = fromAccountId(accountId).chainId
        return namespacesChainIds.includes(chainId)
      })

      filteredAccountIds.forEach(accountId => {
        if (!selectedAccountIds.includes(accountId)) {
          // For correctness' sake only - it doesn't really matter if we toggle this state field, as we'll then
          // call handleApproveAccountIds with all AccountIds directly and users won't see the selection
          toggleAccountId(accountId)
        }
      })
      handleConnectAccountIds(filteredAccountIds)
    }, [
      handleConnectAccountIds,
      selectedAccountIds,
      toggleAccountId,
      requiredNamespaces,
      supportedOptionalNamespacesWithAccounts,
      portfolioAccountIds,
    ])

    const handleReject = useCallback(async () => {
      setIsLoading(true)

      await web3wallet.rejectSession({
        id,
        reason: getSdkError('USER_REJECTED_METHODS'),
      })
    }, [id, web3wallet])

    const handleRejectAndClose = useCallback(async () => {
      await handleReject()
      handleClose()
    }, [handleClose, handleReject])

    // pass a reference to the reject function to the modal manager so it can reject on close
    useImperativeHandle(ref, () => ({
      handleReject,
    }))

    const modalBody: JSX.Element = useMemo(() => {
      return allNamespacesSupported ? (
        <VStack spacing={0}>
          {/* Empty body - all content is now in the ConnectWithFooter */}
        </VStack>
      ) : (
        <ModalSection title=''>
          <RawText textAlign='center' color='text.subtle'>
            {translate('plugins.walletConnectToDapps.modal.sessionProposal.unsupportedChain')}
          </RawText>
        </ModalSection>
      )
    }, [allNamespacesSupported, translate])

    // Render current step
    const renderCurrentStep = () => {
      switch (currentStep) {
        case 'main':
          return (
            <SessionProposalMainScreen
              modalBody={modalBody}
              selectedAddress={selectedAddress}
              uniqueEvmAddresses={uniqueEvmAddresses}
              selectedNetworks={selectedNetworks}
              onAccountClick={handleAccountClick}
              onNetworkClick={handleNetworkClick}
              onConnectAll={handleConnectAll}
              onConnectSelected={() => handleConnectAccountIds(newSelectedAccountIds)}
              onReject={handleRejectAndClose}
              isLoading={isLoading}
              canConnect={newSelectedAccountIds.length > 0 && allNamespacesSupported}
              translate={translate}
            />
          )
        case 'choose-account':
          return (
            <VStack spacing={0} align='stretch' h='full'>
              {/* Header with back arrow */}
              <HStack spacing={3} p={4} align='center'>
                <IconButton
                  aria-label='Back'
                  icon={<ArrowBackIcon />}
                  size='sm'
                  variant='ghost'
                  onClick={() => setCurrentStep('main')}
                />
                <RawText fontWeight='semibold' fontSize='xl' flex={1} textAlign='center'>
                  Choose Account
                </RawText>
                <Box w={8} /> {/* Spacer for centering */}
              </HStack>

              {/* Account list */}
              <VStack spacing={0} align='stretch' px={2} pb={4} flex={1}>
                {uniqueEvmAddresses.map((address, index) => {
                  const accountId = evmAccountIdsByAddress[address][0]
                  const isSelected = newSelectedAccountIds.includes(accountId)

                  return (
                    <Button
                      key={address}
                      variant='ghost'
                      p={4}
                      h='auto'
                      justifyContent='flex-start'
                      onClick={() => {
                        console.log('🏠 Account selected:', accountId)
                        setNewSelectedAccountIds(evmAccountIdsByAddress[address])
                      }}
                      bg='transparent'
                      _hover={{ bg: 'gray.50' }}
                      _dark={{ _hover: { bg: 'gray.800' } }}
                      borderRadius='lg'
                      mb={3}
                    >
                      <HStack spacing={3} width='full' align='center'>
                        <Image borderRadius='full' boxSize='40px' src={makeBlockiesUrl(address)} />
                        <VStack spacing={0} align='start' flex={1}>
                          <RawText fontSize='md' fontWeight='medium'>
                            Account #{index}
                          </RawText>
                          <RawText fontSize='sm' color='gray.500'>
                            {address.slice(0, 6)}...{address.slice(-4)}
                          </RawText>
                        </VStack>
                        <Circle
                          size='20px'
                          bg={isSelected ? 'blue.500' : 'transparent'}
                          border='2px solid'
                          borderColor={isSelected ? 'blue.500' : 'gray.300'}
                        >
                          {isSelected && <Circle size='8px' bg='white' />}
                        </Circle>
                      </HStack>
                    </Button>
                  )
                })}
              </VStack>

              {/* Done button */}
              <Box p={6} borderTop='1px solid' borderColor='whiteAlpha.100'>
                <Button
                  size='lg'
                  width='full'
                  colorScheme='blue'
                  onClick={() => setCurrentStep('main')}
                  isDisabled={newSelectedAccountIds.length === 0}
                >
                  Done
                </Button>
              </Box>
            </VStack>
          )
        case 'choose-network':
          return (
            <VStack spacing={0} align='stretch' h='full'>
              {/* Header with back arrow and Select All */}
              <HStack spacing={3} p={4} align='center'>
                <IconButton
                  aria-label='Back'
                  icon={<ArrowBackIcon />}
                  size='sm'
                  variant='ghost'
                  onClick={() => setCurrentStep('main')}
                />
                <RawText fontWeight='semibold' fontSize='xl' flex={1} textAlign='center'>
                  Choose Network
                </RawText>
                <Button
                  size='sm'
                  variant='ghost'
                  colorScheme='blue'
                  onClick={handleSelectAllChains}
                  fontSize='sm'
                  fontWeight='medium'
                >
                  Select All
                </Button>
              </HStack>

              {/* Network list */}
              <VStack spacing={0} align='stretch' px={4} pb={4} flex={1}>
                {allEvmChainData.map(chain => {
                  const isSelected = selectedChainIds.includes(chain.chainId)
                  const isRequired = requiredChainIds.includes(chain.chainId)
                  const canToggle = chain.hasAccount && !isRequired

                  console.log('🔗 Chain:', chain.name, {
                    chainId: chain.chainId,
                    isSelected,
                    isRequired,
                    canToggle,
                    hasAccount: chain.hasAccount,
                    requiredChainIds,
                    selectedChainIds,
                  })

                  return (
                    <Box
                      key={chain.chainId}
                      py={3}
                      cursor={canToggle ? 'pointer' : 'default'}
                      onClick={canToggle ? () => toggleChainId(chain.chainId) : undefined}
                      opacity={chain.hasAccount ? 1 : 0.5}
                    >
                      <HStack spacing={3} width='full' align='center'>
                        <Image borderRadius='full' boxSize='40px' src={chain.icon} />
                        <VStack spacing={0} align='start' flex={1}>
                          <HStack spacing={2} align='center'>
                            <RawText fontSize='md' fontWeight='medium'>
                              {chain.name}
                            </RawText>
                            {isRequired && (
                              <HStack
                                spacing={1}
                                px={2}
                                py={1}
                                bg='rgba(254, 178, 178, 0.1)'
                                borderRadius='9999px'
                                fontSize='xs'
                                fontWeight='medium'
                                color='rgba(229, 62, 62, 1)'
                                align='center'
                              >
                                <Circle size='12px' bg='rgba(229, 62, 62, 1)' color='white'>
                                  <RawText fontSize='8px' fontWeight='bold'>!</RawText>
                                </Circle>
                                <RawText fontSize='xs' color='rgba(229, 62, 62, 1)' fontWeight='medium'>
                                  Required
                                </RawText>
                              </HStack>
                            )}
                          </HStack>
                        </VStack>
                        <Box
                          w='24px'
                          h='24px'
                          borderRadius='full'
                          bg={isSelected ? (isRequired ? 'gray.400' : 'blue.500') : 'transparent'}
                          border={isSelected ? 'none' : '2px solid'}
                          borderColor='gray.300'
                          display='flex'
                          alignItems='center'
                          justifyContent='center'
                        >
                          {isSelected && (
                            <Box color='white' fontSize='14px' fontWeight='bold'>
                              ✓
                            </Box>
                          )}
                        </Box>
                      </HStack>
                    </Box>
                  )
                })}
              </VStack>

              {/* Done button */}
              <Box p={6}>
                <Button
                  size='lg'
                  width='full'
                  colorScheme='blue'
                  onClick={() => setCurrentStep('main')}
                  isDisabled={
                    selectedChainIds.length === 0 ||
                    !requiredChainIds.every(
                      chainId =>
                        selectedChainIds.includes(chainId) &&
                        allEvmChainData.find(chain => chain.chainId === chainId)?.hasAccount,
                    )
                  }
                >
                  Done
                </Button>
              </Box>
            </VStack>
          )
        default:
          return null
      }
    }

    return (
      <>
        {currentStep === 'main' && proposer.metadata && (
          <VStack spacing={4} align='center' py={6}>
            <Image borderRadius='full' boxSize='48px' src={proposer.metadata.icons?.[0]} />
            <VStack spacing={1} align='center'>
              <RawText fontWeight='semibold' fontSize='lg'>
                {proposer.metadata.name}
              </RawText>
              <RawText color='text.subtle' fontSize='sm'>
                {proposer.metadata.url?.replace(/^https?:\/\//, '')}
              </RawText>
            </VStack>
          </VStack>
        )}
        {renderCurrentStep()}
      </>
    )
  },
)

export const SessionProposalModal = SessionProposal
