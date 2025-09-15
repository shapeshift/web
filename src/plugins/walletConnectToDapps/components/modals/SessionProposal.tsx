import { ChevronDownIcon, InfoOutlineIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Circle,
  Flex,
  HStack,
  Image,
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
import { RawText } from '@/components/Text'
import { knownChainIds } from '@/constants/chains'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { walletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'
import { assertIsDefined } from '@/lib/utils'
import { AccountSelection } from '@/plugins/walletConnectToDapps/components/modals/AccountSelection'
import { ModalSection } from '@/plugins/walletConnectToDapps/components/modals/ModalSection'
import { NetworkSelection } from '@/plugins/walletConnectToDapps/components/modals/NetworkSelection'
import { PeerMeta } from '@/plugins/walletConnectToDapps/components/PeerMeta'
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
  _onConnectAll,
  onConnectSelected,
  onReject,
  isLoading,
  canConnect,
  translate,
}) => {
  const assetsById = useAppSelector(selectAssets)
  const chainAdapterManager = getChainAdapterManager()
  const borderColor = useColorModeValue('gray.100', 'whiteAlpha.100')

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
        borderRadius='full'
      >
        <HStack spacing={2} align='center'>
          <Box boxSize={6} display='flex' alignItems='center' justifyContent='center'>
            <TbPlug size={24} color='cyan.500' />
          </Box>
          <RawText fontSize='sm' color='cyan.500' fontWeight='semibold'>
            Connection Request
          </RawText>
        </HStack>
        <InfoOutlineIcon boxSize={4} color='cyan.500' strokeWidth={2} />
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
                _hover={conditionalHoverStyle}
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
              _hover={hoverStyle}
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
      return networks
    }, [newSelectedAccountIds])

    const uniqueEvmAddresses = useMemo(() => {
      const evmAccountIds = portfolioAccountIds.filter(
        id => fromAccountId(id).chainNamespace === 'eip155',
      )
      const addresses = uniq(evmAccountIds.map(id => fromAccountId(id).account))
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
        setNewSelectedAccountIds(allAccountIdsForAddress)

        // Initialize selected chains with all available chains + required chains
        const chainIds = uniq(allAccountIdsForAddress.map(id => fromAccountId(id).chainId))
        const requiredChains = Object.values(requiredNamespaces).flatMap(
          namespace => namespace.chains ?? [],
        )
        const allSelectedChains = uniq([...chainIds, ...requiredChains])
        setSelectedChainIds(allSelectedChains)
      }
    }, [uniqueEvmAddresses, portfolioAccountIds, newSelectedAccountIds.length, requiredNamespaces])

    // Update newSelectedAccountIds when selectedChainIds changes
    useEffect(() => {
      if (selectedAddress && selectedChainIds.length > 0) {
        const addressAccountIds = evmAccountIdsByAddress[selectedAddress] || []
        const filteredAccountIds = addressAccountIds.filter(id => {
          const chainId = fromAccountId(id).chainId
          return selectedChainIds.includes(chainId)
        })
        setNewSelectedAccountIds(filteredAccountIds)
      }
    }, [selectedChainIds, selectedAddress, evmAccountIdsByAddress])

    // Debug current step
    useEffect(() => {}, [currentStep])

    // Navigation handlers
    const handleAccountClick = useCallback(() => {
      setCurrentStep('choose-account')
    }, [])

    const handleNetworkClick = useCallback(() => {
      setCurrentStep('choose-network')
    }, [])

    // Memoized callbacks for props
    const handleConnectSelected = useCallback(() => handleConnectAccountIds(newSelectedAccountIds), [handleConnectAccountIds, newSelectedAccountIds])
    const handleAddressChange = useCallback((address: string) => {
      setNewSelectedAccountIds(evmAccountIdsByAddress[address] || [])
    }, [evmAccountIdsByAddress])
    const handleBackToMain = useCallback(() => setCurrentStep('main'), [])
    const handleChainIdsChange = useCallback((chainIds: string[]) => setSelectedChainIds(chainIds), [])

    const hoverStyle = useMemo(() => ({ opacity: 0.8 }), [])
    const conditionalHoverStyle = useMemo(() => hasMultipleAddresses ? { opacity: 0.8 } : undefined, [hasMultipleAddresses])

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
    const _allNamespacesHaveAccounts = useMemo(() => {
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

    const _handleConnectSelectedAccountIds = useCallback(
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
              onConnectSelected={handleConnectSelected}
              onReject={handleRejectAndClose}
              isLoading={isLoading}
              canConnect={newSelectedAccountIds.length > 0 && allNamespacesSupported}
              translate={translate}
            />
          )
        case 'choose-account':
          return (
            <AccountSelection
              uniqueEvmAddresses={uniqueEvmAddresses}
              selectedAddress={selectedAddress}
              onAddressChange={handleAddressChange}
              onBack={handleBackToMain}
              onDone={handleBackToMain}
              translate={translate}
            />
          )
        case 'choose-network':
          return (
            <NetworkSelection
              allEvmChainData={allEvmChainData}
              selectedChainIds={selectedChainIds}
              requiredChainIds={requiredChainIds}
              onChainIdsChange={handleChainIdsChange}
              onBack={handleBackToMain}
              onDone={handleBackToMain}
              canProceed={selectedChainIds.length > 0}
              translate={translate}
            />
          )
        default:
          return null
      }
    }

    return (
      <>
        {currentStep === 'main' && proposer.metadata && <PeerMeta metadata={proposer.metadata} />}
        {renderCurrentStep()}
      </>
    )
  },
)

export const SessionProposalModal = SessionProposal
