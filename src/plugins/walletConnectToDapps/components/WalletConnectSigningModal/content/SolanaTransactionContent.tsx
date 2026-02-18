import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import { Box, Button, Card, HStack, Image, useColorModeValue, VStack } from '@chakra-ui/react'
import { solanaChainId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { SolanaTransactionSimulation } from './SolanaTransactionSimulation'

import { RawText } from '@/components/Text'
import { useToggle } from '@/hooks/useToggle/useToggle'
import { ExpandableCell } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/StructuredMessage/ExpandableCell'
import type { ParsedSolanaTransaction } from '@/plugins/walletConnectToDapps/utils/solana'
import { parseSolanaTransaction } from '@/plugins/walletConnectToDapps/utils/solana'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type SolanaTransactionContentProps = {
  transaction: string
}

type SolanaTransactionContentMultiProps = {
  transactions: string[]
}

const SolanaTransactionCard: FC<{ parsed: ParsedSolanaTransaction; transaction: string }> = ({
  parsed,
  transaction,
}) => {
  const translate = useTranslate()
  const sectionBorderColor = useColorModeValue('gray.100', 'whiteAlpha.100')
  const [isDetailExpanded, toggleIsDetailExpanded] = useToggle(false)

  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, solanaChainId))
  const networkIcon = feeAsset?.networkIcon ?? feeAsset?.icon

  const hoverStyle = useMemo(() => ({ bg: 'transparent' }), [])

  return (
    <Card borderRadius='2xl' p={4}>
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
              {networkIcon && <Image boxSize='20px' src={networkIcon} borderRadius='full' />}
            </HStack>
          </HStack>
        )}

        <SolanaTransactionSimulation transaction={transaction} />

        {parsed.primaryProgram && (
          <HStack justify='space-between' align='center' py={1}>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('plugins.walletConnectToDapps.modal.program')}
            </RawText>
            <RawText fontSize='sm' fontWeight='bold'>
              {parsed.primaryProgram}
            </RawText>
          </HStack>
        )}

        {!parsed.primaryProgram && parsed.primaryProgramId && (
          <HStack justify='space-between' align='center' py={1}>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('plugins.walletConnectToDapps.modal.program')}
            </RawText>
            <ExpandableCell value={parsed.primaryProgramId} threshold={20} />
          </HStack>
        )}

        <HStack justify='space-between' align='center' py={1}>
          <RawText fontSize='sm' color='text.subtle'>
            {translate('plugins.walletConnectToDapps.modal.instructions')}
          </RawText>
          <RawText fontSize='sm' fontWeight='bold'>
            {translate('plugins.walletConnectToDapps.modal.nInstructions', {
              count: parsed.instructions.length,
            })}
          </RawText>
        </HStack>

        <HStack justify='space-between' align='center' py={1}>
          <RawText fontSize='sm' color='text.subtle'>
            {translate('plugins.walletConnectToDapps.modal.feePayer')}
          </RawText>
          <ExpandableCell value={parsed.feePayer} threshold={20} />
        </HStack>

        <Box borderTop='1px solid' borderColor={sectionBorderColor} pt={4} mt={2}>
          <Button
            variant='ghost'
            size='sm'
            p={0}
            h='auto'
            fontWeight='medium'
            justifyContent='space-between'
            onClick={toggleIsDetailExpanded}
            _hover={hoverStyle}
            w='full'
            mb={isDetailExpanded ? 3 : 0}
          >
            <RawText fontSize='sm' fontWeight='medium' color='text.subtle'>
              {translate('plugins.walletConnectToDapps.modal.transactionData')}
            </RawText>
            {isDetailExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Button>
          {isDetailExpanded && (
            <VStack spacing={2} align='stretch'>
              {parsed.instructions.map((ix, i) => (
                <HStack key={i} justify='space-between' align='center' py={1}>
                  <RawText fontSize='xs' color='text.subtle' fontFamily='mono'>
                    {ix.programName ?? ix.programId.substring(0, 12) + '...'}
                  </RawText>
                  <RawText fontSize='xs' color='text.subtle'>
                    {ix.accountCount} accounts, {ix.dataLength} bytes
                  </RawText>
                </HStack>
              ))}
            </VStack>
          )}
        </Box>
      </VStack>
    </Card>
  )
}

const FallbackDisplay: FC<{ raw: string }> = ({ raw }) => {
  const truncated = raw.length > 200 ? `${raw.substring(0, 200)}...` : raw
  return (
    <Card borderRadius='2xl' p={4}>
      <RawText
        fontWeight='medium'
        color='text.subtle'
        wordBreak='break-all'
        fontSize='sm'
        fontFamily='mono'
      >
        {truncated}
      </RawText>
    </Card>
  )
}

export const SolanaTransactionContent: FC<SolanaTransactionContentProps> = ({ transaction }) => {
  const parsed = useMemo(() => parseSolanaTransaction(transaction), [transaction])

  if (!parsed) return <FallbackDisplay raw={transaction} />

  return <SolanaTransactionCard parsed={parsed} transaction={transaction} />
}

export const SolanaMultiTransactionContent: FC<SolanaTransactionContentMultiProps> = ({
  transactions,
}) => {
  const translate = useTranslate()

  return (
    <VStack spacing={3} align='stretch'>
      <RawText fontSize='sm' fontWeight='bold' color='text.subtle'>
        {translate('plugins.walletConnectToDapps.modal.nTransactions', {
          count: transactions.length,
        })}
      </RawText>
      {transactions.map((tx, i) => {
        const parsed = parseSolanaTransaction(tx)
        if (!parsed) return <FallbackDisplay key={i} raw={tx} />
        return <SolanaTransactionCard key={i} parsed={parsed} transaction={tx} />
      })}
    </VStack>
  )
}
