import { ChevronDownIcon, InfoOutlineIcon } from '@chakra-ui/icons'
import { Box, Button, Circle, Flex, HStack, useColorModeValue, VStack } from '@chakra-ui/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
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
  selectedNetworks: ChainId[]
  onAccountClick: () => void
  onNetworkClick: () => void
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

  const hasMultipleAddresses = uniqueEvmAddresses.length > 1
  const maxVisibleChains = 4
  const visibleChains = chainData.slice(0, maxVisibleChains)
  const remainingCount = chainData.length - maxVisibleChains

  const hoverStyle = useMemo(() => ({ opacity: 0.8 }), [])
  const conditionalHoverStyle = useMemo(
    () => (hasMultipleAddresses ? { opacity: 0.8 } : undefined),
    [hasMultipleAddresses],
  )
  const darkStyle = useMemo(() => ({ bg: 'gray.700' }), [])

  if (!selectedAddress) return <>{modalBody}</>

  return (
    <>
      {modalBody}

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
                <LazyLoadAvatar
                  src={makeBlockiesUrl(selectedAddress)}
                  boxSize='32px'
                  borderRadius='full'
                />
                <MiddleEllipsis value={selectedAddress} fontSize='sm' fontWeight='medium' />
                {hasMultipleAddresses && <ChevronDownIcon color='text.subtle' boxSize={3} />}
              </HStack>
            </VStack>

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
                      _dark={darkStyle}
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
    const [currentStep, setCurrentStep] = useState<SessionProposalStep>('main')
    const selectedAddress = useMemo(() => {
      const address =
        selectedAccountIds.length > 0 ? fromAccountId(selectedAccountIds[0]).account : null
      return address
    }, [selectedAccountIds])

    const selectedChainIds = useMemo(() => {
      return uniq(selectedAccountIds.map(id => fromAccountId(id).chainId))
    }, [selectedAccountIds])

    const selectedNetworks = useMemo(() => {
      return selectedChainIds
    }, [selectedChainIds])

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

    // Get required chains from the proposal
    const requiredChainIds = useMemo(() => {
      return Object.values(requiredNamespaces).flatMap(namespace => namespace.chains ?? [])
    }, [requiredNamespaces])

    useEffect(() => {
      if (uniqueEvmAddresses.length > 0 && selectedAccountIds.length === 0) {
        const firstAddress = uniqueEvmAddresses[0]
        const allAccountIdsForAddress = portfolioAccountIds.filter(id => {
          const { account, chainNamespace } = fromAccountId(id)
          return chainNamespace === 'eip155' && account === firstAddress
        })
        setSelectedAccountIds(allAccountIdsForAddress)
      }
    }, [uniqueEvmAddresses, portfolioAccountIds, selectedAccountIds.length])

    useEffect(() => {}, [currentStep])

    const handleAccountClick = useCallback(() => {
      setCurrentStep('choose-account')
    }, [])

    const handleNetworkClick = useCallback(() => {
      setCurrentStep('choose-network')
    }, [])

    const handleAddressChange = useCallback(
      (address: string) => {
        setSelectedAccountIds(evmAccountIdsByAddress[address] ?? [])
      },
      [evmAccountIdsByAddress],
    )

    const handleBackToMain = useCallback(() => setCurrentStep('main'), [])

    const handleChainIdsChange = useCallback(
      (chainIds: ChainId[]) => {
        if (selectedAddress) {
          const addressAccountIds = evmAccountIdsByAddress[selectedAddress] ?? []
          const filteredAccountIds = addressAccountIds.filter(id => {
            const chainId = fromAccountId(id).chainId
            return chainIds.includes(chainId)
          })
          setSelectedAccountIds(filteredAccountIds)
        }
      },
      [selectedAddress, evmAccountIdsByAddress],
    )

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

    const handleConnectSelected = useCallback(
      () => handleConnectAccountIds(selectedAccountIds),
      [handleConnectAccountIds, selectedAccountIds],
    )

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
        <VStack spacing={0}></VStack>
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
              onConnectSelected={handleConnectSelected}
              onReject={handleRejectAndClose}
              isLoading={isLoading}
              canConnect={
                selectedAccountIds.length > 0 &&
                allNamespacesSupported &&
                requiredChainIds.every(chainId => selectedChainIds.includes(chainId))
              }
              translate={translate}
            />
          )
        case 'choose-account':
          return (
            <AccountSelection
              selectedAddress={selectedAddress}
              onAddressChange={handleAddressChange}
              onBack={handleBackToMain}
              onDone={handleBackToMain}
            />
          )
        case 'choose-network':
          return (
            <NetworkSelection
              selectedChainIds={selectedChainIds}
              requiredChainIds={requiredChainIds}
              selectedAddress={selectedAddress}
              requiredNamespaces={requiredNamespaces}
              optionalNamespaces={optionalNamespaces}
              onSelectedChainIdsChange={handleChainIdsChange}
              onBack={handleBackToMain}
              onDone={handleBackToMain}
            />
          )
        default:
          return null
      }
    }

    return (
      <>
        {currentStep === 'main' && proposer.metadata && (
          <PeerMeta metadata={proposer.metadata} py={0} />
        )}
        {renderCurrentStep()}
      </>
    )
  },
)

export const SessionProposalModal = SessionProposal
