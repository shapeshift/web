import { Box, HStack, Image, Skeleton, VStack } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { useMemo } from 'react'
import { useWatch } from 'react-hook-form'
import { getAddress } from 'viem'

import { RawText } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { useSimulateEvmTransaction } from '@/plugins/walletConnectToDapps/hooks/useSimulateEvmTransaction'
import type { CustomTransactionData, TransactionParams } from '@/plugins/walletConnectToDapps/types'
import { parseAssetChanges } from '@/plugins/walletConnectToDapps/utils/tenderly'
import type { AssetChange } from '@/plugins/walletConnectToDapps/utils/tenderly/types'
import { selectAssetById, selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type TransactionSimulationProps = {
  transaction: TransactionParams
  chainId: ChainId
}

export const TransactionSimulation: FC<TransactionSimulationProps> = ({ transaction, chainId }) => {
  const connectedAccountFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, chainId ?? ''),
  )

  const { speed } = useWatch<CustomTransactionData>()

  const { simulationQuery } = useSimulateEvmTransaction({ transaction, chainId, speed })

  const assetChanges = useMemo((): AssetChange[] => {
    if (!simulationQuery.data || !transaction?.from) return []
    return parseAssetChanges(simulationQuery.data, getAddress(transaction.from))
  }, [simulationQuery.data, transaction?.from])

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

  if (!(simulationQuery.isLoading || sendChanges.length > 0 || receiveChanges.length > 0)) {
    return null
  }

  return (
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
  )
}