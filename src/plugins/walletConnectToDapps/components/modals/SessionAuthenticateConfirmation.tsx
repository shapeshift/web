import { ArrowUpDownIcon } from '@chakra-ui/icons'
import { Button, HStack, Image, VStack } from '@chakra-ui/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId, toChainId, CHAIN_NAMESPACE } from '@shapeshiftoss/caip'
import type { WalletKitTypes } from '@reown/walletkit'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { Route, Switch, useLocation, useNavigate } from 'wouter'

import { Amount } from '@/components/Amount/Amount'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from '@/components/Text'
import { AccountSelection } from '@/plugins/walletConnectToDapps/components/modals/AccountSelection'
import { PeerMeta } from '@/plugins/walletConnectToDapps/components/PeerMeta'
import { WalletConnectFooter } from '@/plugins/walletConnectToDapps/components/WalletConnectFooter'
import { MessageContent } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/content/MessageContent'
import type { CustomTransactionData } from '@/plugins/walletConnectToDapps/types'
import type { WalletConnectRequestModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'
import {
  selectAccountIdsByAccountNumberAndChainId,
  selectAccountIdsByChainIdFilter,
  selectAssetById,
  selectEvmAddressByAccountNumber,
  selectFeeAssetByChainId,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByFilter,
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

  // Get unique account numbers for the requested chain
  const accountNumbers = useAppSelector(state =>
    selectUniqueEvmAccountNumbers(state)
  )

  // Get all account IDs for the requested chain
  const accountIdsForChain = useAppSelector(state =>
    selectAccountIdsByChainIdFilter(state, { chainId: authChainId })
  )

  // Get the account IDs for selected account number
  const targetAccountNumber = selectedAccountNumber ?? accountNumbers[0]
  const accountIdsForNumber = useAppSelector(state =>
    authChainId && targetAccountNumber !== undefined
      ? selectAccountIdsByAccountNumberAndChainId(state, {
          accountNumber: targetAccountNumber,
          chainId: authChainId
        })
      : []
  )

  // Derive the selected account ID
  const accountId = useMemo(() => {
    if (!authChainId) return undefined
    return accountIdsForNumber?.[0] || accountIdsForChain?.[0]
  }, [authChainId, accountIdsForNumber, accountIdsForChain])

  console.log('[WC Auth Modal] Selected account:', accountId)
  console.log('[WC Auth Modal] Available account numbers:', accountNumbers)

  // Navigation handlers
  const handleAccountClick = useCallback(() => {
    if (accountNumbers.length > 1) {
      navigate(SessionAuthRoutes.ChooseAccount)
    }
  }, [accountNumbers.length, navigate])

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

  // Get account display info
  const userAddress = useMemo(() => accountId ? fromAccountId(accountId).account : '', [accountId])
  const chainId = useMemo(() => accountId ? fromAccountId(accountId).chainId : authChainId, [accountId, authChainId])
  const feeAssetId = useAppSelector(state => selectFeeAssetByChainId(state, chainId || '')?.assetId)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))

  const feeAssetBalanceCryptoPrecision = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, { assetId: feeAssetId, accountId })
  )

  const feeAssetBalanceUserCurrency = useAppSelector(state =>
    selectPortfolioUserCurrencyBalanceByFilter(state, { assetId: feeAssetId, accountId })
  )

  const networkIcon = useMemo(() => {
    return feeAsset?.networkIcon ?? feeAsset?.icon
  }, [feeAsset?.networkIcon, feeAsset?.icon])

  const hasMultipleAccounts = accountNumbers.length > 1

  return (
    <Switch location={location}>
      <Route path={SessionAuthRoutes.ChooseAccount}>
        <AccountSelection
          selectedAccountNumber={targetAccountNumber}
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
              {/* Show account selection section if we have an account */}
              {accountId && feeAsset && (
                <VStack px={2} spacing={4} width='full'>
                  <HStack
                    justify='space-between'
                    align='center'
                    w='full'
                    cursor={hasMultipleAccounts ? 'pointer' : 'default'}
                    onClick={handleAccountClick}
                    _hover={hasMultipleAccounts ? { bg: 'background.surface.raised.base' } : {}}
                    p={2}
                    borderRadius='md'
                  >
                    <HStack spacing={2} align='center'>
                      <Image boxSize='32px' src={networkIcon} borderRadius='full' />
                      <VStack align='flex-start' spacing={0} justify='center'>
                        <RawText fontSize='sm' color='text.subtle' lineHeight='1.2' mb={1}>
                          Signing with
                        </RawText>
                        <MiddleEllipsis value={userAddress} fontSize='sm' fontWeight='medium' />
                      </VStack>
                    </HStack>
                    <HStack spacing={2}>
                      <VStack align='flex-end' spacing={0}>
                        <Amount.Fiat
                          value={feeAssetBalanceUserCurrency ?? '0'}
                          fontSize='sm'
                          fontWeight='medium'
                        />
                        <Amount.Crypto
                          value={feeAssetBalanceCryptoPrecision ?? '0'}
                          symbol={feeAsset.symbol}
                          fontSize='xs'
                          color='text.subtle'
                        />
                      </VStack>
                      {hasMultipleAccounts && <ArrowUpDownIcon color='text.subtle' />}
                    </HStack>
                  </HStack>
                </VStack>
              )}

              {/* Buttons */}
              <HStack spacing={4} w='full'>
                <Button
                  variant='outline'
                  size='lg'
                  flex={1}
                  onClick={handleReject}
                  isDisabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant='solid'
                  colorScheme='blue'
                  size='lg'
                  flex={1}
                  onClick={handleConfirm}
                  isDisabled={!accountId || isLoading}
                  isLoading={isLoading}
                  loadingText='Signing...'
                >
                  {accountId ? 'Sign Message' : 'No Account Available'}
                </Button>
              </HStack>
            </VStack>
          </WalletConnectFooter>
        </VStack>
      </Route>
    </Switch>
  )
}