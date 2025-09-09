import { Card, HStack, Image, useColorModeValue, VStack } from '@chakra-ui/react'
import type { ChainReference } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, toChainId } from '@shapeshiftoss/caip'
import type { TypedDataDomain } from 'abitype'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { validateTypedData } from 'viem'

import { ModalSection } from './ModalSection'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from '@/components/Text'
import { ExternalLinkButton } from '@/plugins/walletConnectToDapps/components/modals/ExternalLinkButtons'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type MessageFieldProps = {
  name: string
  value: string | number | boolean | (string | number | boolean)[] | null
}

const MessageField: React.FC<MessageFieldProps> = ({ name, value }) => {
  const cardBg = useColorModeValue('gray.50', 'gray.850')

  return (
    <VStack align='stretch' py={3} px={3} bg={cardBg} borderRadius='md' spacing={2}>
      <RawText color='text.subtle' fontWeight='medium' fontSize='sm'>
        {name}
      </RawText>
      <RawText fontSize='sm' wordBreak='break-all' whiteSpace='pre-wrap'>
        {value}
      </RawText>
    </VStack>
  )
}

type DomainSectionProps = {
  domain: TypedDataDomain
}

const DomainSection: React.FC<DomainSectionProps> = ({ domain }) => {
  const translate = useTranslate()
  const cardBg = useColorModeValue('white', 'gray.850')

  const domainChainId = useMemo(() => {
    if (!domain.chainId) return undefined

    try {
      return toChainId({
        chainNamespace: CHAIN_NAMESPACE.Evm,
        chainReference: String(domain.chainId) as ChainReference,
      })
    } catch {
      return undefined
    }
  }, [domain.chainId])

  const domainFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, domainChainId ?? ''),
  )

  const contractExplorerLink = useMemo(() => {
    if (!domain.verifyingContract || !domainFeeAsset?.explorerAddressLink) {
      return undefined
    }
    return `${domainFeeAsset.explorerAddressLink}${domain.verifyingContract}`
  }, [domain.verifyingContract, domainFeeAsset?.explorerAddressLink])

  return (
    <Card bg={cardBg} borderRadius='md' p={4}>
      <VStack align='stretch' spacing={2}>
        {domain.verifyingContract && (
          <HStack justify='space-between' align='center' minH='24px'>
            <RawText color='text.subtle' fontSize='sm'>
              Contract
            </RawText>
            <HStack spacing={2} align='center'>
              <RawText>
                {domain.name || <MiddleEllipsis value={domain.verifyingContract} />}
              </RawText>
              <HStack w='24px' h='24px' justify='center' align='center'>
                {contractExplorerLink && (
                  <ExternalLinkButton
                    href={contractExplorerLink}
                    ariaLabel='View contract on explorer'
                  />
                )}
              </HStack>
            </HStack>
          </HStack>
        )}

        {domain.chainId && (
          <HStack justify='space-between' align='center' minH='24px'>
            <RawText color='text.subtle' fontSize='sm'>
              {translate('common.network')}
            </RawText>
            <HStack spacing={2} align='center'>
              <RawText>{domainFeeAsset?.networkName || `Chain ID: ${domain.chainId}`}</RawText>
              <HStack w='24px' h='24px' justify='center' align='center'>
                {domainFeeAsset && (
                  <Image boxSize='16px' src={domainFeeAsset.networkIcon ?? domainFeeAsset.icon} />
                )}
              </HStack>
            </HStack>
          </HStack>
        )}
      </VStack>
    </Card>
  )
}

export type EIP712MessageDisplayProps = {
  typedData: string
}

export const EIP712MessageDisplay: React.FC<EIP712MessageDisplayProps> = ({ typedData }) => {
  const cardBg = useColorModeValue('white', 'gray.850')

  const parsedData = useMemo(() => {
    try {
      const parsed = JSON.parse(typedData)
      validateTypedData(parsed)
      return parsed
    } catch {
      return null
    }
  }, [typedData])

  if (!parsedData) {
    return (
      <Card bg={cardBg} borderRadius='md' p={4}>
        <RawText fontFamily='monospace' fontSize='sm' wordBreak='break-all'>
          {typedData}
        </RawText>
      </Card>
    )
  }

  const { primaryType, domain, message } = parsedData

  return (
    <>
      {domain && Object.keys(domain).length > 0 && (
        <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.domain'>
          <DomainSection domain={domain} />
        </ModalSection>
      )}

      <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.message'>
        <VStack align='stretch' spacing={2}>
          <MessageField name='Primary Type' value={primaryType} />
          {Object.entries(message).map(([key, value]) => (
            <MessageField
              key={key}
              name={key}
              value={value as string | number | boolean | (string | number | boolean)[] | null}
            />
          ))}
        </VStack>
      </ModalSection>
    </>
  )
}
