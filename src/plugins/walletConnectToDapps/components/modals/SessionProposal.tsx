import { ArrowUpDownIcon, InfoOutlineIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Circle,
  Flex,
  HStack,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { ProposalTypes, SessionTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { uniq } from 'lodash'
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
import { SessionProposalOverview } from '@/plugins/walletConnectToDapps/components/modals/SessionProposalOverview'
import type { SessionProposalRef } from '@/plugins/walletConnectToDapps/types'
import { EIP155_SigningMethod, WalletConnectActionType } from '@/plugins/walletConnectToDapps/types'
import type { WalletConnectSessionModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'
import { selectAccountIdsByAccountNumberAndChainId } from '@/state/slices/portfolioSlice/selectors'
import { selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const disabledProp = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }
const hoverStyle = { opacity: 0.8 }
const darkStyle = { bg: 'gray.700' }
const maxVisibleChains = 4
const alertStyles = {
  status: 'info' as const,
  variant: 'subtle' as const,
  borderRadius: 'full',
  bg: 'rgba(0, 181, 216, 0.1)',
  color: 'cyan.600',
}

const alertIconStyles = {
  color: 'cyan.600',
}

const alertTextStyles = {
  fontSize: 'sm' as const,
  color: 'cyan.600',
  fontWeight: 'semibold' as const,
}

const infoIconStyles = {
  boxSize: 4,
  color: 'cyan.600',
  strokeWidth: 2,
  ml: 'auto',
}

const containerBoxStyles = {
  bg: 'transparent',
  borderTopRadius: '24px',
  borderTop: '1px solid',
  borderLeft: '1px solid',
  borderRight: '1px solid',
  px: 8,
  py: 4,
  mx: -6,
  mb: -6,
  mt: 4,
}

const mainHStackStyles = {
  spacing: 4,
  w: 'full' as const,
  justify: 'space-between' as const,
  align: 'start' as const,
}

const leftHStackStyles = {
  spacing: 3,
  align: 'start' as const,
  flex: 1,
}

const avatarStyles = {
  boxSize: '32px',
  borderRadius: 'full',
}

const textVStackStyles = {
  spacing: 1,
  align: 'start' as const,
  h: '32px',
  justify: 'space-between' as const,
}

const labelTextStyles = {
  fontSize: 'xs' as const,
  color: 'text.subtle',
  fontWeight: 'medium' as const,
  lineHeight: '1',
}

const selectorHStackStyles = {
  spacing: 3,
  align: 'center' as const,
  h: '20px',
}

const networkVStackStyles = {
  spacing: 1,
  align: 'end' as const,
  h: '32px',
  justify: 'space-between' as const,
}

const networkHStackStyles = {
  spacing: 2,
  align: 'center' as const,
  h: '20px',
}

const addressTextStyles = {
  fontSize: 'sm' as const,
  fontWeight: 'medium' as const,
}

const arrowIconStyles = {
  color: 'text.subtle',
  boxSize: 3,
}

const chainIconStyles = {
  boxSize: 5,
}

const chainCounterStyles = {
  size: 5,
  bg: 'gray.100',
  color: 'text.base',
  fontSize: '2xs' as const,
  fontWeight: 'medium' as const,
  ml: -1.5,
}

const buttonsHStackStyles = {
  spacing: 4,
  w: 'full' as const,
  mt: 4,
}

const buttonStyles = {
  size: 'lg' as const,
  flex: 1,
}

type SessionProposalStep = 'overview' | 'choose-account' | 'choose-network'

type SessionProposalMainScreenProps = {
  modalBody: JSX.Element
  selectedAccountNumber: number | null
  uniqueAccountNumbers: number[]
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
  selectedAccountNumber,
  uniqueAccountNumbers,
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
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )
  const chainAdapterManager = getChainAdapterManager()
  const borderColor = useColorModeValue('gray.100', 'whiteAlpha.100')

  const hasMultipleAccounts = uniqueAccountNumbers.length > 1
  const visibleChains = selectedNetworks.slice(0, maxVisibleChains)
  const remainingCount = selectedNetworks.length - maxVisibleChains

  const conditionalHoverStyle = useMemo(
    () => (hasMultipleAccounts ? hoverStyle : undefined),
    [hasMultipleAccounts],
  )

  // Get address from account number for display (EVM only)
  const selectedAddress = useMemo(() => {
    if (selectedAccountNumber === null) return null
    const accountsByChain = accountIdsByAccountNumberAndChainId[selectedAccountNumber]
    if (!accountsByChain) return null

    // Only get EVM account for display
    const evmChains = Object.entries(accountsByChain).filter(([chainId]) =>
      chainId.startsWith('eip155:'),
    )

    const firstEvmAccountId = evmChains[0]?.[1]?.[0]
    return firstEvmAccountId ? fromAccountId(firstEvmAccountId).account : null
  }, [selectedAccountNumber, accountIdsByAccountNumberAndChainId])

  if (!selectedAddress) return <>{modalBody}</>

  return (
    <>
      {modalBody}

      <Alert {...alertStyles}>
        <AlertIcon as={TbPlug} {...alertIconStyles} />
        <RawText {...alertTextStyles}>
          {translate('plugins.walletConnectToDapps.modal.connectionRequest')}
        </RawText>
        <InfoOutlineIcon {...infoIconStyles} />
      </Alert>
      <Box {...containerBoxStyles} borderColor={borderColor}>
        <VStack spacing={4}>
          <HStack {...mainHStackStyles}>
            {/* Left: Connect With */}
            <HStack {...leftHStackStyles}>
              <LazyLoadAvatar src={makeBlockiesUrl(selectedAddress)} {...avatarStyles} />
              <VStack {...textVStackStyles}>
                <RawText {...labelTextStyles}>
                  {translate('plugins.walletConnectToDapps.modal.connectWith')}
                </RawText>
                <HStack
                  {...selectorHStackStyles}
                  cursor={hasMultipleAccounts ? 'pointer' : 'default'}
                  onClick={hasMultipleAccounts ? onAccountClick : undefined}
                  _hover={conditionalHoverStyle}
                >
                  <MiddleEllipsis value={selectedAddress} {...addressTextStyles} />
                  {hasMultipleAccounts && <ArrowUpDownIcon {...arrowIconStyles} />}
                </HStack>
              </VStack>
            </HStack>

            {/* Right: Networks */}
            <VStack {...networkVStackStyles}>
              <RawText {...labelTextStyles}>Networks</RawText>
              <HStack
                {...networkHStackStyles}
                cursor='pointer'
                onClick={onNetworkClick}
                _hover={hoverStyle}
              >
                <Flex align='center'>
                  {visibleChains.map((chainId, index) => {
                    const feeAssetId = chainAdapterManager.get(chainId)?.getFeeAssetId()
                    const feeAsset = feeAssetId ? assetsById[feeAssetId] : undefined
                    const icon = feeAsset?.networkIcon ?? feeAsset?.icon

                    return icon ? (
                      <Box key={chainId} ml={index === 0 ? 0 : -1.5} zIndex={index}>
                        <LazyLoadAvatar {...chainIconStyles} src={icon} />
                      </Box>
                    ) : null
                  })}
                  {remainingCount > 0 && (
                    <Circle {...chainCounterStyles} _dark={darkStyle} zIndex={visibleChains.length}>
                      +{remainingCount}
                    </Circle>
                  )}
                </Flex>
                <ArrowUpDownIcon {...arrowIconStyles} />
              </HStack>
            </VStack>
          </HStack>
          <HStack {...buttonsHStackStyles}>
            <Button
              {...buttonStyles}
              onClick={onReject}
              isDisabled={isLoading}
              _disabled={disabledProp}
            >
              {translate('common.reject')}
            </Button>
            <Button
              {...buttonStyles}
              colorScheme='blue'
              type='submit'
              onClick={onConnectSelected}
              isDisabled={!canConnect}
              _disabled={disabledProp}
              isLoading={isLoading}
            >
              {translate('common.confirm')}
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
  selectedChainIds: ChainId[],
): SessionTypes.Namespaces => {
  const approvedNamespaces: SessionTypes.Namespaces = {}

  // Handle required namespaces first
  const requiredApproval = _createApprovalNamespaces(requiredNamespaces, selectedAccounts)
  Object.assign(approvedNamespaces, requiredApproval)

  // Get chain IDs that are already covered by required namespaces
  const requiredChainIds = Object.values(requiredNamespaces)
    .flatMap(namespace => namespace.chains ?? [])
    .filter(chainId => chainId.startsWith('eip155:'))

  // For optional namespaces, only include chains that user selected but are not required
  const additionalChainIds = selectedChainIds.filter(
    chainId => chainId.startsWith('eip155:') && !requiredChainIds.includes(chainId),
  )

  if (additionalChainIds.length > 0) {
    // Create optional namespace for additional EVM chains user selected
    const optionalEvmNamespace = optionalNamespaces?.eip155
    if (optionalEvmNamespace) {
      const eip155AccountIds = selectedAccounts.filter(
        accountId =>
          fromAccountId(accountId).chainNamespace === 'eip155' &&
          additionalChainIds.includes(fromAccountId(accountId).chainId),
      )

      if (eip155AccountIds.length > 0) {
        approvedNamespaces.eip155 = {
          ...(approvedNamespaces.eip155 || {}),
          accounts: uniq([...(approvedNamespaces.eip155?.accounts || []), ...eip155AccountIds]),
          methods:
            optionalEvmNamespace.methods ||
            Object.values(EIP155_SigningMethod).filter(
              method => method !== EIP155_SigningMethod.GET_CAPABILITIES,
            ),
          events: optionalEvmNamespace.events || [],
        }
      }
    }
  }

  return approvedNamespaces
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

    const accountIdsByAccountNumberAndChainId = useAppSelector(
      selectAccountIdsByAccountNumberAndChainId,
    )

    const wallet = useWallet().state.wallet
    const translate = useTranslate()

    const { id, params } = proposal
    const { proposer, requiredNamespaces, optionalNamespaces } = params

    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [selectedAccountIds, setSelectedAccountIds] = useState<AccountId[]>([])
    const [currentStep, setCurrentStep] = useState<SessionProposalStep>('overview')
    const [selectedAccountNumber, setSelectedAccountNumber] = useState<number | null>(null)

    const selectedChainIds = useMemo(() => {
      return uniq(selectedAccountIds.map(id => fromAccountId(id).chainId))
    }, [selectedAccountIds])

    const selectedNetworks = useMemo(() => {
      return selectedChainIds
    }, [selectedChainIds])

    const uniqueAccountNumbers = useMemo(() => {
      // Get unique account numbers that have EVM chains
      const accountNumbers = Object.keys(accountIdsByAccountNumberAndChainId)
        .map(Number)
        .filter(accountNumber => {
          const accountsByChain = accountIdsByAccountNumberAndChainId[accountNumber]
          // Only include account numbers that have at least one EVM chain
          return (
            accountsByChain &&
            Object.keys(accountsByChain).some(chainId => chainId.startsWith('eip155:'))
          )
        })
      return accountNumbers.sort((a, b) => a - b)
    }, [accountIdsByAccountNumberAndChainId])

    // Get EVM account IDs for selected account number
    const selectedAccountIds_computed = useMemo(() => {
      if (selectedAccountNumber === null) return []
      const accountsByChain = accountIdsByAccountNumberAndChainId[selectedAccountNumber]
      if (!accountsByChain) return []

      // Only include EVM chains for WalletConnect
      const evmAccountIds = Object.entries(accountsByChain)
        .filter(([chainId]) => chainId.startsWith('eip155:'))
        .flatMap(([, accountIds]) => accountIds ?? [])
        .filter((id): id is AccountId => Boolean(id))

      return evmAccountIds
    }, [selectedAccountNumber, accountIdsByAccountNumberAndChainId])

    // Get required chains from the proposal
    const requiredChainIds = useMemo(() => {
      return Object.values(requiredNamespaces).flatMap(namespace => namespace.chains ?? [])
    }, [requiredNamespaces])

    // Initialize with first account number
    useEffect(() => {
      if (uniqueAccountNumbers.length > 0 && selectedAccountNumber === null) {
        const firstAccountNumber = uniqueAccountNumbers[0]
        setSelectedAccountNumber(firstAccountNumber)
      }
    }, [uniqueAccountNumbers, selectedAccountNumber])

    // Update selectedAccountIds when selectedAccountNumber changes
    useEffect(() => {
      setSelectedAccountIds(selectedAccountIds_computed)
    }, [selectedAccountIds_computed])

    useEffect(() => {}, [currentStep])

    const handleAccountClick = useCallback(() => {
      setCurrentStep('choose-account')
    }, [])

    const handleNetworkClick = useCallback(() => {
      setCurrentStep('choose-network')
    }, [])

    const handleAccountNumberChange = useCallback((accountNumber: number) => {
      setSelectedAccountNumber(accountNumber)
    }, [])

    const handleBackToOverview = useCallback(() => setCurrentStep('overview'), [])

    const handleChainIdsChange = useCallback(
      (chainIds: ChainId[]) => {
        if (selectedAccountNumber !== null) {
          const accountsByChain = accountIdsByAccountNumberAndChainId[selectedAccountNumber]
          if (accountsByChain) {
            // Only include EVM chains for WalletConnect
            const filteredAccountIds = chainIds
              .filter(chainId => chainId.startsWith('eip155:'))
              .flatMap(chainId => accountsByChain[chainId] ?? [])
              .filter((id): id is AccountId => Boolean(id))
            setSelectedAccountIds(filteredAccountIds)
          }
        }
      },
      [selectedAccountNumber, accountIdsByAccountNumberAndChainId],
    )

    const checkAllNamespacesSupported = useCallback(
      (
        namespaces: ProposalTypes.RequiredNamespaces | ProposalTypes.OptionalNamespaces,
        wallet: HDWallet | null,
      ): boolean =>
        Object.values(namespaces).every(
          namespace =>
            namespace.chains?.every(chainId => {
              // Only check EVM chains for WalletConnect
              if (!chainId.startsWith('eip155:')) return false

              // Check if any account number has this chain
              const hasChainInAnyAccount = Object.values(accountIdsByAccountNumberAndChainId).some(
                accountsByChain => {
                  if (!accountsByChain) return false
                  const chainAccounts = accountsByChain[chainId]
                  return chainAccounts ? chainAccounts.length > 0 : false
                },
              )
              if (!hasChainInAnyAccount) return false

              return walletSupportsChain({
                chainId,
                wallet,
                isSnapInstalled: false,
                checkConnectedAccountIds: Object.values(
                  accountIdsByAccountNumberAndChainId,
                ).flatMap(accountsByChain =>
                  accountsByChain && chainId in accountsByChain
                    ? accountsByChain[chainId] ?? []
                    : [],
                ),
              })
            }),
        ),
      [accountIdsByAccountNumberAndChainId],
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
          optionalNamespaces || {},
          _selectedAccountIds,
          selectedChainIds,
        )

        setIsLoading(true)

        const session = await web3wallet.approveSession({
          id: proposal.id,
          namespaces: approvalNamespaces,
        })
        dispatch({ type: WalletConnectActionType.ADD_SESSION, payload: session })
        handleClose()
      },
      [
        dispatch,
        handleClose,
        proposal,
        web3wallet,
        requiredNamespaces,
        optionalNamespaces,
        selectedChainIds,
      ],
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
        case 'overview':
          return (
            <SessionProposalOverview
              modalBody={modalBody}
              selectedAccountNumber={selectedAccountNumber}
              uniqueAccountNumbers={uniqueAccountNumbers}
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
              selectedAccountNumber={selectedAccountNumber}
              onAccountNumberChange={handleAccountNumberChange}
              onBack={handleBackToOverview}
              onDone={handleBackToOverview}
            />
          )
        case 'choose-network':
          return (
            <NetworkSelection
              selectedChainIds={selectedChainIds}
              requiredChainIds={requiredChainIds}
              selectedAccountNumber={selectedAccountNumber}
              requiredNamespaces={requiredNamespaces}
              onSelectedChainIdsChange={handleChainIdsChange}
              onBack={handleBackToOverview}
              onDone={handleBackToOverview}
            />
          )
        default:
          return null
      }
    }

    return (
      <>
        {currentStep === 'overview' && proposer.metadata && (
          <PeerMeta metadata={proposer.metadata} py={0} />
        )}
        {renderCurrentStep()}
      </>
    )
  },
)

export const SessionProposalModal = SessionProposal
