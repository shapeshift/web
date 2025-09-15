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
import { fromAccountId } from '@shapeshiftoss/caip'
import type { JSX } from 'react'
import { useMemo } from 'react'
import { TbPlug } from 'react-icons/tb'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from '@/components/Text'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'
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

type SessionProposalOverviewProps = {
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

export const SessionProposalOverview: React.FC<SessionProposalOverviewProps> = ({
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

  const selectedAddress = useMemo(() => {
    if (selectedAccountNumber === null) return null
    const accountsByChain = accountIdsByAccountNumberAndChainId[selectedAccountNumber]
    if (!accountsByChain) return null

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
