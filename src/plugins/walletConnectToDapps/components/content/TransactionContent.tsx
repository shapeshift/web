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
import {
  detectContractType,
  getFunctionName,
  parseApprovalData,
  parseTransferData,
} from '@/plugins/walletConnectToDapps/utils/contractDetection'
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

  // Phase 1 Contract Intelligence
  const contractInfo = useMemo(() => {
    if (!transaction?.to) return null
    return detectContractType(transaction.to)
  }, [transaction?.to])

  // For token approvals, the 'to' address is the token contract being approved
  const approvalTokenAsset = useAppSelector(state => {
    if (!transaction?.to || !chainId) return null

    try {
      const assetId = toAssetId({
        chainId,
        assetNamespace: 'erc20',
        assetReference: transaction.to.toLowerCase(),
      })
      return selectAssetById(state, assetId)
    } catch {
      return null
    }
  })

  const approvalData = useMemo(() => {
    if (!transaction?.data || !chainId) return null
    const data = parseApprovalData(transaction.data, chainId)
    if (!data) return null

    // Try to get token info if we're approving a token
    // For ERC20 approvals, the 'to' address is the token contract
    let formattedAmount = data.amount
    if (!data.isUnlimited && approvalTokenAsset) {
      // Format with proper decimals
      const amountInPrecision = fromBaseUnit(data.amountRaw, approvalTokenAsset.precision)
      formattedAmount = `${amountInPrecision} ${approvalTokenAsset.symbol}`
    }

    return {
      ...data,
      formattedAmount: data.isUnlimited ? 'Unlimited' : formattedAmount,
    }
  }, [transaction?.data, chainId, approvalTokenAsset])

  // For token transfers, the 'to' address in the transaction is the token contract
  const transferTokenAsset = useAppSelector(state => {
    if (!transaction?.to || !chainId || !transaction?.data) return null
    const functionName = getFunctionName(transaction.data)
    if (functionName !== 'transfer' && functionName !== 'transferFrom') return null

    try {
      const assetId = toAssetId({
        chainId,
        assetNamespace: 'erc20',
        assetReference: transaction.to.toLowerCase(),
      })
      return selectAssetById(state, assetId)
    } catch {
      return null
    }
  })

  const transferData = useMemo(() => {
    if (!transaction?.data) return null
    const data = parseTransferData(transaction.data)
    if (!data || !transferTokenAsset) return data

    // Format with proper decimals
    const amountInPrecision = fromBaseUnit(data.amount, transferTokenAsset.precision)
    return {
      ...data,
      formattedAmount: `${amountInPrecision} ${transferTokenAsset.symbol}`,
    }
  }, [transaction?.data, transferTokenAsset])

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
    // Prioritize Tenderly simulation method name if available
    if (simulationQuery.data?.simulation?.method) {
      return simulationQuery.data.simulation.method
    }
    
    // Fallback to hardcoded function signature parsing
    if (!transaction?.data) return null
    return getFunctionName(transaction.data)
  }, [transaction?.data, simulationQuery.data?.simulation?.method])

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
        {/* Contract Info Header */}
        {contractInfo && (
          <Box>
            <HStack mb={4}>
              <Tag size='sm' colorScheme='purple' variant='subtle'>
                {contractInfo.type.toUpperCase()}
              </Tag>
              <RawText fontSize='sm' fontWeight='medium'>
                {contractInfo.name}
              </RawText>
            </HStack>
          </Box>
        )}

        {/* Main Transaction Details */}
        <VStack spacing={3} align='stretch'>
          {/* Action/Method */}
          <HStack justify='space-between'>
            <RawText fontSize='sm' color='text.subtle'>
              Method
            </RawText>
            <Skeleton isLoaded={!simulationQuery.isLoading}>
              <RawText fontSize='sm'>{functionName || 'Loading...'}</RawText>
            </Skeleton>
          </HStack>

          {/* Approval-specific details */}
          {approvalData && (
            <>
              <HStack justify='space-between'>
                <RawText fontSize='sm' color='text.subtle'>
                  Approve Token
                </RawText>
                <HStack spacing={2}>
                  <RawText fontSize='sm'>
                    {approvalTokenAsset?.symbol ||
                      transaction.to.slice(0, 6) + '...' + transaction.to.slice(-4)}
                  </RawText>
                  {approvalTokenAsset && (
                    <Image boxSize='16px' src={approvalTokenAsset.icon} borderRadius='full' />
                  )}
                </HStack>
              </HStack>
              <HStack justify='space-between'>
                <RawText fontSize='sm' color='text.subtle'>
                  Amount
                </RawText>
                <HStack spacing={2}>
                  <RawText fontSize='sm' color={approvalData.isUnlimited ? 'red.400' : undefined}>
                    {approvalData.formattedAmount}
                  </RawText>
                  {approvalTokenAsset && !approvalData.isUnlimited && (
                    <Image boxSize='16px' src={approvalTokenAsset.icon} borderRadius='full' />
                  )}
                </HStack>
              </HStack>
              <HStack justify='space-between'>
                <RawText fontSize='sm' color='text.subtle'>
                  Spender
                </RawText>
                <RawText fontSize='sm' fontFamily='mono'>
                  {approvalData.spender.slice(0, 6)}...{approvalData.spender.slice(-4)}
                </RawText>
              </HStack>
            </>
          )}

          {/* Transfer-specific details */}
          {transferData && (
            <>
              <HStack justify='space-between'>
                <RawText fontSize='sm' color='text.subtle'>
                  Send Token
                </RawText>
                <HStack spacing={2}>
                  <RawText fontSize='sm'>
                    {transferTokenAsset?.symbol ||
                      transaction.to.slice(0, 6) + '...' + transaction.to.slice(-4)}
                  </RawText>
                  {transferTokenAsset && (
                    <Image boxSize='16px' src={transferTokenAsset.icon} borderRadius='full' />
                  )}
                </HStack>
              </HStack>
              <HStack justify='space-between'>
                <RawText fontSize='sm' color='text.subtle'>
                  Send To
                </RawText>
                <RawText fontSize='sm' fontFamily='mono'>
                  {transferData.to.slice(0, 6)}...{transferData.to.slice(-4)}
                </RawText>
              </HStack>
              <HStack justify='space-between'>
                <RawText fontSize='sm' color='text.subtle'>
                  Amount
                </RawText>
                <RawText fontSize='sm'>
                  {'formattedAmount' in transferData
                    ? transferData.formattedAmount
                    : transferData.amount}
                </RawText>
              </HStack>
            </>
          )}

          {/* Regular send or contract interaction */}
          {!approvalData && !transferData && (
            <>
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

              {/* Method for unrecognized contract interactions */}
              {isInteractingWithContract && !functionName && transaction?.data && (
                <HStack justify='space-between'>
                  <RawText fontSize='sm' color='text.subtle'>
                    Method
                  </RawText>
                  <RawText fontSize='sm' fontFamily='mono'>
                    {transaction.data.slice(0, 10)}
                  </RawText>
                </HStack>
              )}
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
