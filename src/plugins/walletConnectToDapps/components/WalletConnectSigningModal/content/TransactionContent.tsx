import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Card,
  HStack,
  Image,
  Skeleton,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'

import { RawText } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { StructuredField } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/StructuredMessage/StructuredMessage'
import { StructuredMessage } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/StructuredMessage/StructuredMessage'
import type {
  EthSendTransactionCallRequest,
  EthSignTransactionCallRequest,
} from '@/plugins/walletConnectToDapps/types'
import type { AssetChange, ParsedArgument } from '@/plugins/walletConnectToDapps/utils/tenderly'
import {
  convertToStructuredFields,
  fetchSimulation,
  parseAssetChanges,
  parseDecodedInput,
} from '@/plugins/walletConnectToDapps/utils/tenderly'
import { selectAssetById, selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type TransactionContentProps = {
  transaction:
    | EthSendTransactionCallRequest['params'][0]
    | EthSignTransactionCallRequest['params'][0]
  chainId: ChainId
  isInteractingWithContract: boolean
}

export const TransactionContent: FC<TransactionContentProps> = ({ transaction, chainId }) => {
  const cardBg = useColorModeValue('white', 'whiteAlpha.50')
  const [isTransactionDataExpanded, setIsTransactionDataExpanded] = useState(true)

  const connectedAccountFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, chainId ?? ''),
  )

  const simulationQuery = useQuery({
    queryKey: [
      'tenderly-simulation',
      chainId,
      transaction?.from,
      transaction?.to,
      transaction?.data,
    ],
    queryFn: () =>
      transaction?.from && transaction?.to && transaction?.data
        ? fetchSimulation({
            chainId,
            from: transaction.from,
            to: transaction.to,
            data: transaction.data,
          })
        : null,
    enabled: Boolean(transaction?.from && transaction?.to && transaction?.data),
    staleTime: 30000,
    retry: false,
  })

  const functionName = useMemo(() => {
    return simulationQuery.data?.simulation?.method || null
  }, [simulationQuery.data?.simulation?.method])

  const assetChanges = useMemo((): AssetChange[] => {
    if (!simulationQuery.data || !transaction?.from) return []
    return parseAssetChanges(simulationQuery.data, transaction.from)
  }, [simulationQuery.data, transaction?.from])

  // Parse decoded input arguments from Tenderly simulation
  const decodedArguments = useMemo((): ParsedArgument[] => {
    if (!simulationQuery.data) return []
    return parseDecodedInput(simulationQuery.data)
  }, [simulationQuery.data])

  // Convert to structured fields for the shared component
  const structuredFields = useMemo((): StructuredField[] => {
    return convertToStructuredFields(decodedArguments)
  }, [decodedArguments])

  const sendChanges = useMemo(
    () => assetChanges.filter(change => change.type === 'send'),
    [assetChanges],
  )

  const receiveChanges = useMemo(
    () => assetChanges.filter(change => change.type === 'receive'),
    [assetChanges],
  )

  // Create asset selectors for each unique token address
  const tokenAddresses = useMemo(() => {
    const addresses = new Set<string>()
    assetChanges.forEach(change => {
      if (change.tokenAddress) {
        addresses.add(change.tokenAddress)
      }
    })
    return Array.from(addresses)
  }, [assetChanges])

  // Get asset info for all tokens
  const tokenAssets = useAppSelector(state => {
    const assets: Record<string, any> = {}
    tokenAddresses.forEach(address => {
      try {
        const assetId = toAssetId({
          chainId,
          assetNamespace: 'erc20',
          assetReference: address.toLowerCase(),
        })
        assets[address] = selectAssetById(state, assetId)
      } catch {
        assets[address] = null
      }
    })
    return assets
  })

  const handleToggleTransactionData = useCallback(() => {
    setIsTransactionDataExpanded(!isTransactionDataExpanded)
  }, [isTransactionDataExpanded])

  const hoverStyle = useMemo(() => ({ bg: 'transparent' }), [])

  if (simulationQuery.error) {
    console.error('Tenderly simulation error:', simulationQuery.error)
  }

  return (
    <Card bg={cardBg} borderRadius='2xl' p={4}>
      <VStack spacing={3} align='stretch'>
        {connectedAccountFeeAsset && (
          <HStack justify='space-between' align='center' py={1}>
            <RawText fontSize='sm' color='text.subtle'>
              Chain
            </RawText>
            <HStack spacing={2}>
              <RawText fontSize='sm' fontWeight='bold'>
                {connectedAccountFeeAsset.networkName || connectedAccountFeeAsset.name}
              </RawText>
              <Image
                boxSize='20px'
                src={connectedAccountFeeAsset.networkIcon || connectedAccountFeeAsset.icon}
                borderRadius='full'
              />
            </HStack>
          </HStack>
        )}

        {(simulationQuery.isLoading || sendChanges.length > 0 || receiveChanges.length > 0) && (
          <Skeleton isLoaded={!simulationQuery.isLoading}>
            {simulationQuery.isLoading ? (
              <VStack spacing={2} align='stretch'>
                <HStack justify='space-between' align='center' py={1}>
                  <RawText fontSize='sm' color='text.subtle'>
                    Loading changes...
                  </RawText>
                  <Box />
                </HStack>
                <HStack justify='space-between' align='center' py={1}>
                  <RawText fontSize='sm' color='text.subtle'>
                    Analyzing transaction...
                  </RawText>
                  <Box />
                </HStack>
              </VStack>
            ) : (
              <VStack spacing={2} align='stretch'>
                {sendChanges.map((change, index) => {
                  // Use Tenderly's parsed amount (already formatted) or fallback to our asset lookup
                  const asset = change.isNativeAsset
                    ? connectedAccountFeeAsset
                    : change.tokenAddress
                    ? tokenAssets[change.tokenAddress]
                    : null

                  const symbol = (
                    change.symbol ||
                    asset?.symbol ||
                    (change.isNativeAsset ? 'ETH' : 'TOKEN')
                  ).toUpperCase()
                  const icon = asset?.icon || asset?.networkIcon

                  const amount = bnOrZero(change.amount).abs()
                  const formattedAmount =
                    (amount?.dp() ?? 0) > 6 ? amount?.toFixed(6) ?? '0' : amount?.toFixed() ?? '0'

                  return (
                    <HStack key={`send-${index}`} justify='space-between' align='center' py={1}>
                      <RawText fontSize='sm' color='text.subtle'>
                        Send
                      </RawText>
                      <HStack spacing={2}>
                        <RawText fontSize='sm' color='red.400' fontWeight='bold'>
                          -{formattedAmount} {symbol}
                        </RawText>
                        {icon && <Image boxSize='20px' src={icon} borderRadius='full' />}
                      </HStack>
                    </HStack>
                  )
                })}

                {receiveChanges.map((change, index) => {
                  // Use Tenderly's parsed amount (already formatted) or fallback to our asset lookup
                  const asset = change.isNativeAsset
                    ? connectedAccountFeeAsset
                    : change.tokenAddress
                    ? tokenAssets[change.tokenAddress]
                    : null

                  const symbol = (
                    change.symbol ||
                    asset?.symbol ||
                    (change.isNativeAsset ? 'ETH' : 'TOKEN')
                  ).toUpperCase()
                  const icon = asset?.icon || asset?.networkIcon

                  const amount = bnOrZero(change.amount)
                  const formattedAmount =
                    (amount?.dp() ?? 0) > 6 ? amount?.toFixed(6) ?? '0' : amount?.toFixed() ?? '0'

                  return (
                    <HStack key={`receive-${index}`} justify='space-between' align='center' py={1}>
                      <RawText fontSize='sm' color='text.subtle'>
                        Receive
                      </RawText>
                      <HStack spacing={2}>
                        <RawText fontSize='sm' color='green.400' fontWeight='bold'>
                          +{formattedAmount} {symbol}
                        </RawText>
                        {icon && <Image boxSize='20px' src={icon} borderRadius='full' />}
                      </HStack>
                    </HStack>
                  )
                })}
              </VStack>
            )}
          </Skeleton>
        )}

        <HStack justify='space-between' align='center' py={1}>
          <RawText fontSize='sm' color='text.subtle'>
            Interact Contract
          </RawText>
          <RawText fontSize='sm' fontFamily='mono' fontWeight='bold'>
            {transaction.to.slice(0, 6)}...{transaction.to.slice(-4)}
          </RawText>
        </HStack>

        {transaction?.data &&
          (simulationQuery.isLoading || functionName || structuredFields.length > 0) && (
            <>
              <Box borderTop='1px solid' borderColor='whiteAlpha.100' pt={4} mt={2}>
                <Button
                  variant='ghost'
                  size='sm'
                  p={0}
                  h='auto'
                  fontWeight='medium'
                  justifyContent='space-between'
                  onClick={handleToggleTransactionData}
                  _hover={hoverStyle}
                  w='full'
                  mb={3}
                >
                  <RawText fontSize='sm' fontWeight='medium' color='text.subtle'>
                    Transaction Data
                  </RawText>
                  {isTransactionDataExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                </Button>

                {isTransactionDataExpanded && (
                  <VStack spacing={2} align='stretch'>
                    {(simulationQuery.isLoading || functionName) && (
                      <HStack justify='space-between' align='center' py={1}>
                        <RawText fontSize='sm' color='text.subtle'>
                          Method
                        </RawText>
                        <Skeleton isLoaded={!simulationQuery.isLoading}>
                          <RawText fontSize='sm' fontFamily='mono' fontWeight='bold'>
                            {functionName || 'Loading...'}
                          </RawText>
                        </Skeleton>
                      </HStack>
                    )}

                    {(simulationQuery.isLoading || structuredFields.length > 0) && (
                      <StructuredMessage
                        fields={structuredFields}
                        chainId={chainId}
                        isLoading={simulationQuery.isLoading}
                      />
                    )}
                  </VStack>
                )}
              </Box>
            </>
          )}
      </VStack>
    </Card>
  )
}
