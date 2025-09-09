import { Box, Card, HStack, Tag, useColorModeValue, VStack } from '@chakra-ui/react'
import type { TypedData, TypedDataDomain } from 'abitype'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ModalSection } from './ModalSection'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from '@/components/Text'
import {
  getSolidityTypeCategory,
  isEIP712TypedData,
} from '@/plugins/walletConnectToDapps/types/eip712'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

interface MessageFieldProps {
  name: string
  value: unknown
  type?: string
}

const MessageField: React.FC<MessageFieldProps> = ({ name, value, type }) => {
  const cardBg = useColorModeValue('gray.50', 'gray.850')

  const formattedValue = useMemo(() => {
    if (value === null || value === undefined) return 'null'

    const typeCategory = type ? getSolidityTypeCategory(type) : 'string'

    switch (typeCategory) {
      case 'address':
        // Always show full address for security - no ellipsis
        return String(value)

      case 'uint':
      case 'int':
        // Format large numbers with thousand separators
        const numStr = String(value)
        if (numStr.length > 12) {
          // For very large numbers, show in scientific notation or abbreviated
          return numStr
        }
        return Number(value).toLocaleString()

      case 'bytes':
        // Show bytes data in monospace with ellipsis for long values
        const bytesStr = String(value)
        if (bytesStr.length > 66) {
          return <MiddleEllipsis value={bytesStr} />
        }
        return bytesStr

      case 'bool':
        return value ? 'true' : 'false'

      case 'array':
        return JSON.stringify(value)

      default:
        return String(value)
    }
  }, [value, type])

  const formatFieldName = (fieldName: string): string => {
    // Convert camelCase to Title Case
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  return (
    <VStack align='stretch' py={3} px={3} bg={cardBg} borderRadius='md' spacing={2}>
      <HStack justify='space-between' align='center'>
        <RawText color='text.subtle' fontWeight='medium' fontSize='sm'>
          {formatFieldName(name)}
        </RawText>
        {type && (
          <Tag size='sm' colorScheme='gray' variant='subtle'>
            {type}
          </Tag>
        )}
      </HStack>
      <Box>
        <RawText
          fontFamily={type === 'address' || type?.startsWith('bytes') ? 'monospace' : 'body'}
          fontSize='sm'
          wordBreak='break-all'
          whiteSpace='pre-wrap'
        >
          {formattedValue}
        </RawText>
      </Box>
    </VStack>
  )
}

interface DomainSectionProps {
  domain: TypedDataDomain
  chainId?: string
}

const DomainSection: React.FC<DomainSectionProps> = ({ domain, chainId }) => {
  const translate = useTranslate()
  const cardBg = useColorModeValue('white', 'gray.850')

  const connectedChainFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, chainId ?? ''),
  )

  return (
    <Card bg={cardBg} borderRadius='md' p={4}>
      <VStack align='stretch' spacing={2}>
        <Text
          translation='plugins.walletConnectToDapps.modal.signMessage.signingDomain'
          fontWeight='bold'
          fontSize='md'
        />

        {domain.name && (
          <HStack justify='space-between'>
            <RawText color='text.subtle' fontSize='sm'>
              {translate('plugins.walletConnectToDapps.modal.signMessage.contractName')}
            </RawText>
            <RawText fontWeight='medium'>{domain.name}</RawText>
          </HStack>
        )}

        {domain.version && (
          <HStack justify='space-between'>
            <RawText color='text.subtle' fontSize='sm'>
              {translate('plugins.walletConnectToDapps.modal.signMessage.version')}
            </RawText>
            <RawText>{domain.version}</RawText>
          </HStack>
        )}

        {domain.chainId && (
          <HStack justify='space-between'>
            <RawText color='text.subtle' fontSize='sm'>
              {translate('plugins.walletConnectToDapps.modal.signMessage.network')}
            </RawText>
            <RawText>
              {connectedChainFeeAsset?.networkName || `Chain ID: ${domain.chainId}`}
            </RawText>
          </HStack>
        )}

        {domain.verifyingContract && (
          <HStack justify='space-between'>
            <RawText color='text.subtle' fontSize='sm'>
              {translate('plugins.walletConnectToDapps.modal.signMessage.verifyingContract')}
            </RawText>
            <MiddleEllipsis value={domain.verifyingContract} />
          </HStack>
        )}
      </VStack>
    </Card>
  )
}

export interface EIP712MessageDisplayProps {
  typedData: string
  chainId?: string
}

export const EIP712MessageDisplay: React.FC<EIP712MessageDisplayProps> = ({
  typedData,
  chainId,
}) => {
  const cardBg = useColorModeValue('white', 'gray.850')

  const parsedData = useMemo((): TypedData | null => {
    try {
      const parsed = JSON.parse(typedData)
      if (isEIP712TypedData(parsed)) {
        return parsed as TypedData
      }
      return null
    } catch {
      return null
    }
  }, [typedData])

  if (!parsedData) {
    // Fallback to raw display if not proper EIP-712
    return (
      <Card bg={cardBg} borderRadius='md' p={4}>
        <RawText fontFamily='monospace' fontSize='sm' wordBreak='break-all'>
          {typedData}
        </RawText>
      </Card>
    )
  }

  const { types, primaryType, domain, message } = parsedData
  const messageType = types[primaryType]

  return (
    <>
      {/* Primary Type Header */}
      <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.messageType'>
        <Card bg={cardBg} borderRadius='md' p={3}>
          <HStack>
            <Text
              translation='plugins.walletConnectToDapps.modal.signMessage.signingType'
              color='text.subtle'
              fontSize='sm'
            />
            <Tag size='md' colorScheme='blue'>
              {primaryType}
            </Tag>
          </HStack>
        </Card>
      </ModalSection>

      {/* Message Content */}
      <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.messageContent'>
        <VStack align='stretch' spacing={2}>
          {Object.entries(message).map(([key, value]) => {
            const fieldType = Array.isArray(messageType)
              ? messageType.find(field => field.name === key)?.type
              : undefined
            return <MessageField key={key} name={key} value={value} type={fieldType} />
          })}
        </VStack>
      </ModalSection>

      {/* Domain Information */}
      {domain && Object.keys(domain).length > 0 && (
        <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.domain'>
          <DomainSection domain={domain} chainId={chainId} />
        </ModalSection>
      )}
    </>
  )
}
