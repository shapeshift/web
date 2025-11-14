import { ArrowUpDownIcon, InfoOutlineIcon } from '@chakra-ui/icons'
import { Alert, AlertIcon, Button, HStack, Tooltip, VStack } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ProposalTypes } from '@walletconnect/types'
import { useMemo } from 'react'
import { TbPlug } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { WalletConnectFooter } from '../WalletConnectFooter'

import { ChainIcons } from '@/components/ChainIcons'
import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { RawText } from '@/components/Text'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'
import {
  selectAccountIdsByAccountNumberAndChainId,
  selectEvmAddressByAccountNumber,
  selectUniqueEvmAccountNumbers,
} from '@/state/slices/portfolioSlice/selectors'
import { useAppSelector } from '@/state/store'

const disabledSx = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }

type SessionProposalOverviewProps = {
  requiredNamespaces?: ProposalTypes.RequiredNamespaces
  selectedAccountNumber: number | null
  selectedNetworks: ChainId[]
  onAccountClick: () => void
  onNetworkClick?: () => void
  onConnectSelected: () => void
  onReject: () => void
  isLoading: boolean
  canConnect: boolean
  hideNetworkSelection?: boolean
  children?: React.ReactNode
}

export const SessionProposalOverview: React.FC<SessionProposalOverviewProps> = ({
  requiredNamespaces = {},
  selectedAccountNumber,
  selectedNetworks,
  onAccountClick,
  onNetworkClick,
  onConnectSelected,
  onReject,
  isLoading,
  canConnect,
  hideNetworkSelection = false,
  children,
}) => {
  const translate = useTranslate()
  const selectedAddress = useAppSelector(state =>
    selectEvmAddressByAccountNumber(state, { accountNumber: selectedAccountNumber ?? undefined }),
  )
  const uniqueAccountNumbers = useAppSelector(selectUniqueEvmAccountNumbers)
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )

  const connectWithHoverSx = useMemo(
    () => (uniqueAccountNumbers.length > 1 ? { opacity: 0.8 } : undefined),
    [uniqueAccountNumbers.length],
  )

  const networkHoverSx = useMemo(() => ({ opacity: 0.8 }), [])

  /*
  We need to pass an account for every supported namespace. If we can't, we cannot approve the session.
  https://docs.walletconnect.com/2.0/specs/clients/sign/session-namespaces#21-session-namespaces-must-not-have-accounts-empty
   */
  const isAllRequiredNamespacesSupported = useMemo(() => {
    if (selectedAccountNumber === null) return false

    const accountsByChain = accountIdsByAccountNumberAndChainId[selectedAccountNumber]
    if (!accountsByChain) return false

    return Object.values(requiredNamespaces).every(
      namespace =>
        namespace.chains?.every(chainId => {
          if (!isEvmChainId(chainId)) return false
          return Boolean(accountsByChain[chainId]?.length)
        }),
    )
  }, [requiredNamespaces, selectedAccountNumber, accountIdsByAccountNumberAndChainId])

  if (!selectedAddress) return null

  return (
    <>
      <DialogBody pb={6}>
        {children ? (
          children
        ) : (
          <>
            {!isAllRequiredNamespacesSupported && (
              <Alert status='error' mb={4}>
                <RawText textAlign='center' color='text.subtle'>
                  {translate('plugins.walletConnectToDapps.modal.sessionProposal.unsupportedChain')}
                </RawText>
              </Alert>
            )}
            <Alert
              status='info'
              variant='subtle'
              borderRadius='full'
              bg='rgba(0, 181, 216, 0.1)'
              color='cyan.600'
            >
              <AlertIcon as={TbPlug} boxSize={6} color='cyan.600' />
              <RawText fontSize='sm' color='cyan.600' fontWeight='semibold'>
                {translate('plugins.walletConnectToDapps.modal.connectionRequest')}
              </RawText>
              <Tooltip
                label={translate('plugins.walletConnectToDapps.modal.connectionRequestTooltip')}
                placement='top'
              >
                <InfoOutlineIcon boxSize={4} color='cyan.600' strokeWidth={2} ml='auto' />
              </Tooltip>
            </Alert>
          </>
        )}
      </DialogBody>
      <WalletConnectFooter>
        <VStack spacing={4} width='full'>
          <HStack spacing={4} w='full' justify='space-between' align='start'>
            <HStack spacing={3} align='start' flex={1}>
              <LazyLoadAvatar
                src={makeBlockiesUrl(selectedAddress)}
                boxSize='32px'
                borderRadius='full'
              />
              <VStack spacing={1} align='start' h='32px' justify='space-between'>
                <RawText fontSize='xs' color='text.subtle' fontWeight='medium' lineHeight='1'>
                  {translate('plugins.walletConnectToDapps.modal.connectWith')}
                </RawText>
                <HStack
                  spacing={3}
                  align='center'
                  h='20px'
                  cursor={uniqueAccountNumbers.length > 1 ? 'pointer' : 'default'}
                  onClick={uniqueAccountNumbers.length > 1 ? onAccountClick : undefined}
                  _hover={connectWithHoverSx}
                >
                  <MiddleEllipsis value={selectedAddress} fontSize='sm' fontWeight='medium' />
                  {uniqueAccountNumbers.length > 1 && (
                    <ArrowUpDownIcon color='text.subtle' boxSize={3} />
                  )}
                </HStack>
              </VStack>
            </HStack>
            {!hideNetworkSelection && (
              <VStack spacing={1} align='end' h='32px' justify='space-between'>
                <RawText fontSize='xs' color='text.subtle' fontWeight='medium' lineHeight='1'>
                  {translate('plugins.walletConnectToDapps.header.menu.networks')}
                </RawText>
                <HStack
                  spacing={2}
                  align='center'
                  h='20px'
                  cursor={onNetworkClick ? 'pointer' : 'default'}
                  onClick={onNetworkClick}
                  _hover={onNetworkClick ? networkHoverSx : undefined}
                >
                  <ChainIcons chainIds={selectedNetworks} />
                  {selectedNetworks.length > 1 && (
                    <ArrowUpDownIcon color='text.subtle' boxSize={3} />
                  )}
                </HStack>
              </VStack>
            )}
          </HStack>
          <HStack spacing={4} w='full' mt={4}>
            <Button
              size='lg'
              flex={1}
              onClick={onReject}
              isDisabled={isLoading}
              _disabled={disabledSx}
            >
              {translate('common.reject')}
            </Button>
            <Button
              size='lg'
              flex={1}
              colorScheme='blue'
              type='submit'
              onClick={onConnectSelected}
              isDisabled={!canConnect}
              _disabled={disabledSx}
              isLoading={isLoading}
            >
              {translate('common.confirm')}
            </Button>
          </HStack>
        </VStack>
      </WalletConnectFooter>
    </>
  )
}
