import { ArrowUpDownIcon } from '@chakra-ui/icons'
import { Button, HStack, VStack } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { toChainId, CHAIN_NAMESPACE } from '@shapeshiftoss/caip'
import type { WalletKitTypes } from '@reown/walletkit'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { Route, Switch, useLocation, useNavigate } from 'wouter'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from '@/components/Text'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'
import { AccountSelection } from '@/plugins/walletConnectToDapps/components/modals/AccountSelection'
import { PeerMeta } from '@/plugins/walletConnectToDapps/components/PeerMeta'
import { WalletConnectFooter } from '@/plugins/walletConnectToDapps/components/WalletConnectFooter'
import { MessageContent } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/content/MessageContent'
import type { CustomTransactionData } from '@/plugins/walletConnectToDapps/types'
import type { WalletConnectRequestModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'
import {
  selectAccountIdsByAccountNumberAndChainId,
  selectEvmAddressByAccountNumber,
  selectUniqueEvmAccountNumbers,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

enum SessionAuthRoutes {
  Overview = '/overview',
  ChooseAccount = '/choose-account',
}

export const SessionAuthenticateConfirmation: FC<
  WalletConnectRequestModalProps<any>
> = ({ onConfirm, onReject, state, topic }) => {
  console.log('[WC Auth Modal] Rendering SessionAuthenticateConfirmation')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAccountNumber, setSelectedAccountNumber] = useState<number | null>(null)
  const [location] = useLocation()
  const navigate = useNavigate()

  // Get the auth request from modal data
  const authRequest = state.modalData?.request as
    | WalletKitTypes.EventArguments['session_authenticate']
    | undefined

  if (!authRequest) {
    console.error('[WC Auth Modal] No auth request found in modal data!')
    return <div>No auth request data</div>
  }

  const { params } = authRequest || {}
  const { authPayload, requester } = params || {}

  console.log('[WC Auth Modal] Auth request found:', authRequest)
  console.log('[WC Auth Modal] Auth payload:', authPayload)
  console.log('[WC Auth Modal] Requester:', requester)

  // Extract chainId from auth payload (e.g., "eip155:8453" -> chainId)
  const authChainId = useMemo(() => {
    const caipChainId = authPayload?.chains?.[0]
    if (!caipChainId) return undefined

    // Parse CAIP-2 chain ID (e.g., "eip155:8453")
    const [namespace, reference] = caipChainId.split(':')
    if (namespace !== 'eip155') return undefined

    return toChainId({
      chainNamespace: CHAIN_NAMESPACE.Evm,
      chainReference: reference as any,
    })
  }, [authPayload])

  console.log('[WC Auth Modal] Extracted chainId:', authChainId)

  // Get unique account numbers
  const uniqueAccountNumbers = useAppSelector(selectUniqueEvmAccountNumbers)
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )

  // Use first account number as default if none selected
  const effectiveAccountNumber = selectedAccountNumber ?? uniqueAccountNumbers[0]

  // Get the address for the selected account number
  const selectedAddress = useAppSelector(state =>
    selectEvmAddressByAccountNumber(state, { accountNumber: effectiveAccountNumber ?? undefined }),
  )

  // Get the account ID for signing (from the selected account number + auth chain)
  const accountId = useMemo(() => {
    if (!authChainId || effectiveAccountNumber === null || effectiveAccountNumber === undefined) {
      return undefined
    }
    const accountsByChain = accountIdsByAccountNumberAndChainId[effectiveAccountNumber]
    return accountsByChain?.[authChainId]?.[0]
  }, [authChainId, effectiveAccountNumber, accountIdsByAccountNumberAndChainId])

  console.log('[WC Auth Modal] Selected account number:', effectiveAccountNumber)
  console.log('[WC Auth Modal] Selected address:', selectedAddress)
  console.log('[WC Auth Modal] Account ID for signing:', accountId)

  // Navigation handlers
  const handleAccountClick = useCallback(() => {
    if (uniqueAccountNumbers.length > 1) {
      navigate(SessionAuthRoutes.ChooseAccount)
    }
  }, [uniqueAccountNumbers.length, navigate])

  const handleBack = useCallback(() => {
    navigate(SessionAuthRoutes.Overview)
  }, [navigate])

  const handleAccountNumberChange = useCallback((accountNumber: number) => {
    setSelectedAccountNumber(accountNumber)
    navigate(SessionAuthRoutes.Overview)
  }, [navigate])

  // Format the SIWE message for display
  const displayMessage = useMemo(() => {
    if (!authPayload) {
      console.error('[WC Auth Modal] No auth payload!')
      return 'Invalid authentication request'
    }
    const statement = authPayload.statement || 'Sign in with your wallet'
    const domain = authPayload.domain || 'Unknown domain'
    const chainInfo = authPayload.chains?.[0] || 'Unknown chain'

    const message = `${domain} wants you to sign in.\n\n${statement}\n\nChain: ${chainInfo}`
    console.log('[WC Auth Modal] Display message:', message)
    return message
  }, [authPayload])

  const handleConfirm = useCallback(
    async () => {
      console.log('[WC Auth Modal] Confirm clicked')
      console.log('[WC Auth Modal] Using account for signing:', accountId)

      setIsLoading(true)
      try {
        // Pass the account ID to the confirm handler
        const customData: CustomTransactionData = {
          accountId
        }
        await onConfirm(customData)
      } finally {
        setIsLoading(false)
      }
    },
    [onConfirm, accountId],
  )

  const handleReject = useCallback(
    async () => {
      console.log('[WC Auth Modal] Reject clicked')
      await onReject()
    },
    [onReject],
  )

  // Use requester metadata for peer info
  const peerMetadata = requester?.metadata

  // Hover effect for clickable account (matches SessionProposalOverview)
  const connectWithHoverSx = useMemo(
    () => (uniqueAccountNumbers.length > 1 ? { opacity: 0.8 } : undefined),
    [uniqueAccountNumbers.length],
  )

  return (
    <Switch location={location}>
      <Route path={SessionAuthRoutes.ChooseAccount}>
        <AccountSelection
          selectedAccountNumber={effectiveAccountNumber}
          onBack={handleBack}
          onAccountNumberChange={handleAccountNumberChange}
          onDone={handleBack}
        />
      </Route>
      <Route path={SessionAuthRoutes.Overview}>
        <VStack spacing={0} align='stretch' flex={1} minHeight={0}>
          {peerMetadata && <PeerMeta metadata={peerMetadata} />}
          <DialogBody flex={1} overflow='auto' minHeight={0} pb={6}>
            <MessageContent message={displayMessage} />
          </DialogBody>
          <WalletConnectFooter>
            <VStack spacing={4} width='full'>
              {/* Account selection - matches SessionProposalOverview pattern */}
              {selectedAddress && (
                <HStack spacing={3} align='start' w='full'>
                  <LazyLoadAvatar
                    src={makeBlockiesUrl(selectedAddress)}
                    boxSize='32px'
                    borderRadius='full'
                  />
                  <VStack spacing={1} align='start' h='32px' justify='space-between' flex={1}>
                    <RawText fontSize='xs' color='text.subtle' fontWeight='medium' lineHeight='1'>
                      Signing with
                    </RawText>
                    <HStack
                      spacing={3}
                      align='center'
                      h='20px'
                      cursor={uniqueAccountNumbers.length > 1 ? 'pointer' : 'default'}
                      onClick={uniqueAccountNumbers.length > 1 ? handleAccountClick : undefined}
                      _hover={connectWithHoverSx}
                    >
                      <MiddleEllipsis value={selectedAddress} fontSize='sm' fontWeight='medium' />
                      {uniqueAccountNumbers.length > 1 && (
                        <ArrowUpDownIcon color='text.subtle' boxSize={3} />
                      )}
                    </HStack>
                  </VStack>
                </HStack>
              )}

              {/* Buttons */}
              <HStack spacing={4} w='full' mt={4}>
                <Button
                  size='lg'
                  flex={1}
                  onClick={handleReject}
                  isDisabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  size='lg'
                  flex={1}
                  colorScheme='blue'
                  onClick={handleConfirm}
                  isDisabled={!accountId || isLoading}
                  isLoading={isLoading}
                >
                  Sign Message
                </Button>
              </HStack>
            </VStack>
          </WalletConnectFooter>
        </VStack>
      </Route>
    </Switch>
  )
}