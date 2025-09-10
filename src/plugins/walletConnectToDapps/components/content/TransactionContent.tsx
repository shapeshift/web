import { Box, Card, HStack, Image, Skeleton, Tag, useColorModeValue, VStack } from '@chakra-ui/react'
import { toAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import type { FC } from 'react'
import { useMemo } from 'react'
import { fromHex, isHex } from 'viem'

import { RawText } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import type {
  EthSendTransactionCallRequest,
  EthSignTransactionCallRequest,
} from '@/plugins/walletConnectToDapps/types'
import { fetchSimulation, parseAssetChanges, type AssetChange } from '@/plugins/walletConnectToDapps/utils/tenderly'
import { selectAssetById, selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type TransactionContentProps = {
  transaction:
    | EthSendTransactionCallRequest['params'][0]
    | EthSignTransactionCallRequest['params'][0]
  chainId: string
  isInteractingWithContract: boolean
  feeAsset?: {
    symbol: string
    precision: number
    icon: string
  }
}

export const TransactionContent: FC<TransactionContentProps> = ({
  transaction,
  chainId,
  isInteractingWithContract,
  feeAsset,
}) => {
  const cardBg = useColorModeValue('white', 'whiteAlpha.50')

  const connectedAccountFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, chainId ?? ''),
  )

  const value = useMemo(() => {
    if (!feeAsset) return '0'

    const valueCryptoBaseUnit =
      transaction?.value && isHex(transaction.value)
        ? fromHex(transaction.value, 'bigint').toString()
        : transaction?.value
    const valueCryptoPrecision = fromBaseUnit(valueCryptoBaseUnit ?? '0', feeAsset.precision)
    return valueCryptoPrecision
  }, [feeAsset, transaction?.value])



  // Tenderly simulation for enhanced transaction analysis
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
    staleTime: 30000, // Cache for 30 seconds
    retry: false,
  })

  const functionName = useMemo(() => {
    // Only show method name if Tenderly simulation provides it
    return simulationQuery.data?.simulation?.method || null
  }, [simulationQuery.data?.simulation?.method])

  // Parse asset changes from Tenderly simulation
  const assetChanges = useMemo((): AssetChange[] => {
    if (!simulationQuery.data || !transaction?.from) return []
    return parseAssetChanges(simulationQuery.data, transaction.from)
  }, [simulationQuery.data, transaction?.from])

  const sendChanges = useMemo(() => 
    assetChanges.filter(change => change.type === 'send'), 
    [assetChanges]
  )
  
  const receiveChanges = useMemo(() => 
    assetChanges.filter(change => change.type === 'receive'), 
    [assetChanges]
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

  if (simulationQuery.error) {
    console.error('Tenderly simulation error:', simulationQuery.error)
  }

  return (
    <Card bg={cardBg} borderRadius='2xl' p={4}>
      <VStack spacing={3} align='stretch'>

        {/* Main Transaction Details */}
        <VStack spacing={3} align='stretch'>
          {/* Chain/Network */}
          {connectedAccountFeeAsset && (
            <HStack justify='space-between'>
              <RawText fontSize='sm' color='text.subtle'>
                Chain
              </RawText>
              <HStack spacing={2}>
                <RawText fontSize='sm'>
                  {connectedAccountFeeAsset.networkName || connectedAccountFeeAsset.name}
                </RawText>
                <Image
                  boxSize='16px'
                  src={connectedAccountFeeAsset.networkIcon || connectedAccountFeeAsset.icon}
                  borderRadius='full'
                />
              </HStack>
            </HStack>
          )}

          {/* Interact Contract */}
          <HStack justify='space-between'>
            <RawText fontSize='sm' color='text.subtle'>
              {isInteractingWithContract ? 'Interact Contract' : 'Send To'}
            </RawText>
            <RawText fontSize='sm' fontFamily='mono'>
              {transaction.to.slice(0, 6)}...{transaction.to.slice(-4)}
            </RawText>
          </HStack>

          {/* Transaction Data Section */}
          {transaction?.data && (simulationQuery.isLoading || functionName) && (
            <>
              <Box borderTop='1px solid' borderColor='whiteAlpha.100' pt={3} mt={3}>
                <RawText fontSize='sm' fontWeight='medium' mb={3} color='text.subtle'>
                  Transaction Data
                </RawText>
              </Box>
              
              <HStack justify='space-between'>
                <RawText fontSize='sm' color='text.subtle'>
                  Method
                </RawText>
                <Skeleton isLoaded={!simulationQuery.isLoading}>
                  <RawText fontSize='sm' fontFamily='mono'>
                    {functionName || 'Loading...'}
                  </RawText>
                </Skeleton>
              </HStack>
            </>
          )}

          {/* Tenderly-powered Asset Changes */}
          {(simulationQuery.isLoading || sendChanges.length > 0 || receiveChanges.length > 0) && (
            <>
              <Box borderTop='1px solid' borderColor='whiteAlpha.100' pt={3} mt={3}>
                <RawText fontSize='sm' fontWeight='medium' mb={3} color='text.subtle'>
                  Estimated changes
                </RawText>
              </Box>

              <Skeleton isLoaded={!simulationQuery.isLoading}>
                {simulationQuery.isLoading ? (
                  <>
                    <HStack justify='space-between' mb={2}>
                      <RawText fontSize='sm' color='text.subtle'>
                        Loading changes...
                      </RawText>
                      <Box />
                    </HStack>
                    <HStack justify='space-between'>
                      <RawText fontSize='sm' color='text.subtle'>
                        Analyzing transaction...
                      </RawText>
                      <Box />
                    </HStack>
                  </>
                ) : (
                  <>
                    {/* Send Changes */}
                    {sendChanges.map((change, index) => {
                      // Use Tenderly's parsed amount (already formatted) or fallback to our asset lookup
                      const asset = change.isNativeAsset 
                        ? connectedAccountFeeAsset
                        : change.tokenAddress 
                          ? tokenAssets[change.tokenAddress]
                          : null

                      const symbol = change.symbol || asset?.symbol || (change.isNativeAsset ? 'ETH' : 'TOKEN')
                      const icon = asset?.icon || asset?.networkIcon
                      
                      // Use bnOrZero and proper formatting with max 6 decimal places
                      const amount = bnOrZero(change.amount).abs()
                      const formattedAmount = amount.dp() > 6 ? amount.toFixed(6) : amount.toFixed()

                      return (
                        <HStack key={`send-${index}`} justify='space-between'>
                          <RawText fontSize='sm' color='text.subtle'>
                            You send
                          </RawText>
                          <HStack spacing={2}>
                            <RawText fontSize='sm' color='red.400'>
                              -{formattedAmount} {symbol}
                            </RawText>
                            {icon && (
                              <Image boxSize='16px' src={icon} borderRadius='full' />
                            )}
                          </HStack>
                        </HStack>
                      )
                    })}

                    {/* Receive Changes */}
                    {receiveChanges.map((change, index) => {
                      // Use Tenderly's parsed amount (already formatted) or fallback to our asset lookup
                      const asset = change.isNativeAsset 
                        ? connectedAccountFeeAsset
                        : change.tokenAddress 
                          ? tokenAssets[change.tokenAddress]
                          : null

                      const symbol = change.symbol || asset?.symbol || (change.isNativeAsset ? 'ETH' : 'TOKEN')
                      const icon = asset?.icon || asset?.networkIcon
                      
                      // Use bnOrZero and proper formatting with max 6 decimal places
                      const amount = bnOrZero(change.amount)
                      const formattedAmount = amount.dp() > 6 ? amount.toFixed(6) : amount.toFixed()

                      return (
                        <HStack key={`receive-${index}`} justify='space-between'>
                          <RawText fontSize='sm' color='text.subtle'>
                            You receive
                          </RawText>
                          <HStack spacing={2}>
                            <RawText fontSize='sm' color='green.400'>
                              +{formattedAmount} {symbol}
                            </RawText>
                            {icon && (
                              <Image boxSize='16px' src={icon} borderRadius='full' />
                            )}
                          </HStack>
                        </HStack>
                      )
                    })}
                  </>
                )}
              </Skeleton>
            </>
          )}
        </VStack>
      </VStack>
    </Card>
  )
}
