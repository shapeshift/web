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
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useWatch } from 'react-hook-form'

import { RawText } from '@/components/Text'
import { ExpandableCell } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/StructuredMessage/ExpandableCell'
import type { StructuredField } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/StructuredMessage/StructuredMessage'
import { StructuredMessage } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/StructuredMessage/StructuredMessage'
import { TransactionSimulation } from './TransactionSimulation'
import { useSimulateEvmTransaction } from '@/plugins/walletConnectToDapps/hooks/useSimulateEvmTransaction'
import type { CustomTransactionData, TransactionParams } from '@/plugins/walletConnectToDapps/types'
import {
  convertToStructuredFields,
  parseDecodedInput,
} from '@/plugins/walletConnectToDapps/utils/tenderly'
import type {
  ParsedArgument,
} from '@/plugins/walletConnectToDapps/utils/tenderly/types'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type TransactionContentProps = {
  transaction: TransactionParams
  chainId: ChainId
}

export const TransactionContent: FC<TransactionContentProps> = ({ transaction, chainId }) => {
  const cardBg = useColorModeValue('white', 'whiteAlpha.50')
  const [isTransactionDataExpanded, setIsTransactionDataExpanded] = useState(true)

  const connectedAccountFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, chainId ?? ''),
  )

  const { speed } = useWatch<CustomTransactionData>()

  const { simulationQuery } = useSimulateEvmTransaction({ transaction, chainId, speed })

  const functionName = useMemo(() => {
    return simulationQuery.data?.simulation?.method || null
  }, [simulationQuery.data?.simulation?.method])

  // Parse decoded input arguments from Tenderly simulation
  const decodedArguments = useMemo((): ParsedArgument[] => {
    if (!simulationQuery.data) return []
    return parseDecodedInput(simulationQuery.data)
  }, [simulationQuery.data])

  // Convert to structured fields for the shared component
  const structuredFields = useMemo((): StructuredField[] => {
    return convertToStructuredFields(decodedArguments)
  }, [decodedArguments])

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

        <TransactionSimulation transaction={transaction} chainId={chainId} />

        <HStack justify='space-between' align='center' py={1}>
          <RawText fontSize='sm' color='text.subtle'>
            Interact Contract
          </RawText>
          <ExpandableCell value={transaction.to} threshold={20} />
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
