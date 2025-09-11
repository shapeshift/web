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
import { useMemo } from 'react'
import { useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'

import { TransactionSimulation } from './TransactionSimulation'

import { RawText } from '@/components/Text'
import { useToggle } from '@/hooks/useToggle/useToggle'
import { ExpandableCell } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/StructuredMessage/ExpandableCell'
import type { StructuredField } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/StructuredMessage/StructuredMessage'
import { StructuredMessage } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/StructuredMessage/StructuredMessage'
import { useSimulateEvmTransaction } from '@/plugins/walletConnectToDapps/hooks/useSimulateEvmTransaction'
import type { CustomTransactionData, TransactionParams } from '@/plugins/walletConnectToDapps/types'
import {
  convertToStructuredFields,
  parseDecodedInput,
} from '@/plugins/walletConnectToDapps/utils/tenderly'
import type { ParsedArgument } from '@/plugins/walletConnectToDapps/utils/tenderly/types'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type TransactionContentProps = {
  transaction: TransactionParams
  chainId: ChainId
}

export const TransactionContent: FC<TransactionContentProps> = ({ transaction, chainId }) => {
  const translate = useTranslate()
  const cardBg = useColorModeValue('white', 'whiteAlpha.50')
  const sectionBorderColor = useColorModeValue('gray.100', 'whiteAlpha.100')
  const [isTransactionDataExpanded, toggleIsTransactionDataExpanded] = useToggle(true)

  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))

  const { speed } = useWatch<CustomTransactionData>()

  const { simulationQuery } = useSimulateEvmTransaction({ transaction, chainId, speed })

  const functionName = useMemo(() => {
    return simulationQuery.data?.simulation?.method || null
  }, [simulationQuery.data?.simulation?.method])

  const decodedArguments = useMemo((): ParsedArgument[] => {
    if (!simulationQuery.data) return []
    return parseDecodedInput(simulationQuery.data)
  }, [simulationQuery.data])

  const structuredFields = useMemo((): StructuredField[] => {
    return convertToStructuredFields(decodedArguments)
  }, [decodedArguments])

  const hoverStyle = useMemo(() => ({ bg: 'transparent' }), [])

  return (
    <Card bg={cardBg} borderRadius='2xl' p={4}>
      <VStack spacing={3} align='stretch'>
        {feeAsset && (
          <HStack justify='space-between' align='center' py={1}>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('common.network')}
            </RawText>
            <HStack spacing={2}>
              <RawText fontSize='sm' fontWeight='bold'>
                {feeAsset.networkName || feeAsset.name}
              </RawText>
              <Image
                boxSize='20px'
                src={feeAsset.networkIcon || feeAsset.icon}
                borderRadius='full'
              />
            </HStack>
          </HStack>
        )}

        <TransactionSimulation transaction={transaction} chainId={chainId} />

        <HStack justify='space-between' align='center' py={1}>
          <RawText fontSize='sm' color='text.subtle'>
            {translate('plugins.walletConnectToDapps.modal.interactContract')}
          </RawText>
          <ExpandableCell value={transaction.to} threshold={20} />
        </HStack>

        <>
          <Box borderTop='1px solid' borderColor={sectionBorderColor} pt={4} mt={2}>
            <Button
              variant='ghost'
              size='sm'
              p={0}
              h='auto'
              fontWeight='medium'
              justifyContent='space-between'
              onClick={toggleIsTransactionDataExpanded}
              _hover={hoverStyle}
              w='full'
              mb={3}
            >
              <RawText fontSize='sm' fontWeight='medium' color='text.subtle'>
                {translate('plugins.walletConnectToDapps.modal.transactionData')}
              </RawText>
              {isTransactionDataExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </Button>
            {isTransactionDataExpanded && (
              <VStack spacing={2} align='stretch'>
                <HStack justify='space-between' align='center' py={1}>
                  <RawText fontSize='sm' color='text.subtle'>
                    {translate('plugins.walletConnectToDapps.modal.method')}
                  </RawText>
                  <Skeleton isLoaded={!simulationQuery.isLoading}>
                    <RawText fontSize='sm' fontFamily='mono' fontWeight='bold'>
                      {functionName ?? ''}
                    </RawText>
                  </Skeleton>
                </HStack>
                <StructuredMessage
                  fields={structuredFields}
                  chainId={chainId}
                  isLoading={simulationQuery.isLoading}
                />
              </VStack>
            )}
          </Box>
        </>
      </VStack>
    </Card>
  )
}
