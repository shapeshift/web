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
import type { ChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ProposalTypes } from '@walletconnect/types'
import { useMemo } from 'react'
import { TbPlug } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from '@/components/Text'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'
import {
  selectAccountIdsByAccountNumberAndChainId,
  selectEvmAddressByAccountNumber,
  selectUniqueEvmAccountNumbers,
} from '@/state/slices/portfolioSlice/selectors'
import { selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const disabledSx = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }
const hoverSx = { opacity: 0.8 }
const darkSx = { bg: 'gray.700' }
const maxVisibleChains = 4

const alertSx = {
  status: 'info' as const,
  variant: 'subtle' as const,
  borderRadius: 'full',
  bg: 'rgba(0, 181, 216, 0.1)',
  color: 'cyan.600',
}

const alertIconSx = {
  color: 'cyan.600',
}

const alertTextSx = {
  fontSize: 'sm' as const,
  color: 'cyan.600',
  fontWeight: 'semibold' as const,
}

const infoIconSx = {
  boxSize: 4,
  color: 'cyan.600',
  strokeWidth: 2,
  ml: 'auto',
}

const containerBoxSx = {
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

const mainHStackSx = {
  spacing: 4,
  w: 'full' as const,
  justify: 'space-between' as const,
  align: 'start' as const,
}

const leftHStackSx = {
  spacing: 3,
  align: 'start' as const,
  flex: 1,
}

const avatarSx = {
  boxSize: '32px',
  borderRadius: 'full',
}

const textVStackSx = {
  spacing: 1,
  align: 'start' as const,
  h: '32px',
  justify: 'space-between' as const,
}

const labelTextSx = {
  fontSize: 'xs' as const,
  color: 'text.subtle',
  fontWeight: 'medium' as const,
  lineHeight: '1',
}

const selectorHStackSx = {
  spacing: 3,
  align: 'center' as const,
  h: '20px',
}

const networkVStackSx = {
  spacing: 1,
  align: 'end' as const,
  h: '32px',
  justify: 'space-between' as const,
}

const networkHStackSx = {
  spacing: 2,
  align: 'center' as const,
  h: '20px',
}

const addressTextSx = {
  fontSize: 'sm' as const,
  fontWeight: 'medium' as const,
}

const arrowIconSx = {
  color: 'text.subtle',
  boxSize: 3,
}

const chainIconSx = {
  boxSize: 5,
}

const chainCounterSx = {
  size: 5,
  bg: 'gray.100',
  color: 'text.base',
  fontSize: '2xs' as const,
  fontWeight: 'medium' as const,
  ml: -1.5,
}

const buttonsHStackSx = {
  spacing: 4,
  w: 'full' as const,
  mt: 4,
}

const buttonSx = {
  size: 'lg' as const,
  flex: 1,
}

type SessionProposalOverviewProps = {
  requiredNamespaces: ProposalTypes.RequiredNamespaces
  selectedAccountNumber: number | null
  selectedNetworks: ChainId[]
  onAccountClick: () => void
  onNetworkClick: () => void
  onConnectSelected: () => void
  onReject: () => void
  isLoading: boolean
  canConnect: boolean
}

export const SessionProposalOverview: React.FC<SessionProposalOverviewProps> = ({
  requiredNamespaces,
  selectedAccountNumber,
  selectedNetworks,
  onAccountClick,
  onNetworkClick,
  onConnectSelected,
  onReject,
  isLoading,
  canConnect,
}) => {
  const assetsById = useAppSelector(selectAssets)
  const selectedAddress = useAppSelector(state =>
    selectEvmAddressByAccountNumber(state, { accountNumber: selectedAccountNumber ?? undefined }),
  )
  const uniqueAccountNumbers = useAppSelector(selectUniqueEvmAccountNumbers)
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )
  const translate = useTranslate()
  const chainAdapterManager = getChainAdapterManager()
  const borderColor = useColorModeValue('gray.100', 'whiteAlpha.100')

  const hasMultipleAccounts = uniqueAccountNumbers.length > 1
  const visibleChains = selectedNetworks.slice(0, maxVisibleChains)
  const remainingCount = selectedNetworks.length - maxVisibleChains

  const conditionalHoverSx = useMemo(
    () => (hasMultipleAccounts ? hoverSx : undefined),
    [hasMultipleAccounts],
  )

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
      {!isAllRequiredNamespacesSupported && (
        <Alert status='error' mb={4}>
          <RawText textAlign='center' color='text.subtle'>
            {translate('plugins.walletConnectToDapps.modal.sessionProposal.unsupportedChain')}
          </RawText>
        </Alert>
      )}
      <Alert {...alertSx}>
        <AlertIcon as={TbPlug} {...alertIconSx} />
        <RawText {...alertTextSx}>
          {translate('plugins.walletConnectToDapps.modal.connectionRequest')}
        </RawText>
        <InfoOutlineIcon {...infoIconSx} />
      </Alert>
      <Box {...containerBoxSx} borderColor={borderColor}>
        <VStack spacing={4}>
          <HStack {...mainHStackSx}>
            <HStack {...leftHStackSx}>
              <LazyLoadAvatar src={makeBlockiesUrl(selectedAddress)} {...avatarSx} />
              <VStack {...textVStackSx}>
                <RawText {...labelTextSx}>
                  {translate('plugins.walletConnectToDapps.modal.connectWith')}
                </RawText>
                <HStack
                  {...selectorHStackSx}
                  cursor={hasMultipleAccounts ? 'pointer' : 'default'}
                  onClick={hasMultipleAccounts ? onAccountClick : undefined}
                  _hover={conditionalHoverSx}
                >
                  <MiddleEllipsis value={selectedAddress} {...addressTextSx} />
                  {hasMultipleAccounts && <ArrowUpDownIcon {...arrowIconSx} />}
                </HStack>
              </VStack>
            </HStack>
            <VStack {...networkVStackSx}>
              <RawText {...labelTextSx}>
                {translate('plugins.walletConnectToDapps.header.menu.networks')}
              </RawText>
              <HStack
                {...networkHStackSx}
                cursor='pointer'
                onClick={onNetworkClick}
                _hover={hoverSx}
              >
                <Flex align='center'>
                  {visibleChains.map((chainId, index) => {
                    const feeAssetId = chainAdapterManager.get(chainId)?.getFeeAssetId()
                    const feeAsset = feeAssetId ? assetsById[feeAssetId] : undefined
                    const icon = feeAsset?.networkIcon ?? feeAsset?.icon

                    return icon ? (
                      <Box key={chainId} ml={index === 0 ? 0 : -1.5} zIndex={index}>
                        <LazyLoadAvatar {...chainIconSx} src={icon} />
                      </Box>
                    ) : null
                  })}
                  {remainingCount > 0 && (
                    <Circle {...chainCounterSx} _dark={darkSx} zIndex={visibleChains.length}>
                      +{remainingCount}
                    </Circle>
                  )}
                </Flex>
                <ArrowUpDownIcon {...arrowIconSx} />
              </HStack>
            </VStack>
          </HStack>
          <HStack {...buttonsHStackSx}>
            <Button {...buttonSx} onClick={onReject} isDisabled={isLoading} _disabled={disabledSx}>
              {translate('common.reject')}
            </Button>
            <Button
              {...buttonSx}
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
      </Box>
    </>
  )
}
