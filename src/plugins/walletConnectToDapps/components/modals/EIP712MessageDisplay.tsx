import { Box, Card, HStack, Image, useColorModeValue, VStack } from '@chakra-ui/react'
import type { ChainReference } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, toAssetId, toChainId } from '@shapeshiftoss/caip'
import type { TypedDataDomain } from 'abitype'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { isAddress, validateTypedData } from 'viem'

import { ModalSection } from './ModalSection'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from '@/components/Text'
import { ExpandableAddressCell } from '@/plugins/walletConnectToDapps/components/ExpandableAddressCell'
import { ExternalLinkButton } from '@/plugins/walletConnectToDapps/components/modals/ExternalLinkButtons'
import type { EIP712TypedData, EIP712Value } from '@/plugins/walletConnectToDapps/types'
import { selectAssetById, selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type MessageFieldProps = {
  name: string
  value: EIP712Value
  chainId?: string
}

const MessageField: React.FC<MessageFieldProps> = ({ name, value, chainId }) => {
  const maybeAssetId = useMemo(() => {
    if (!chainId || typeof value !== 'string' || !isAddress(value)) return null

    try {
      return toAssetId({
        chainId,
        assetNamespace: 'erc20',
        assetReference: value,
      })
    } catch {
      return null
    }
  }, [value, chainId])

  const asset = useAppSelector(state =>
    maybeAssetId ? selectAssetById(state, maybeAssetId) : null,
  )

  const valueString = String(value)
  const isAddressField = typeof value === 'string' && isAddress(value)
  const isAddressWithoutAsset = isAddressField && !asset

  if (asset) {
    return (
      <HStack justify='space-between' align='center' py={2}>
        <RawText color='text.subtle' fontSize='sm'>
          {name}
        </RawText>
        <HStack spacing={2} align='center'>
          <RawText fontSize='sm'>{asset.symbol}</RawText>
          <Image boxSize='16px' src={asset.icon} borderRadius='full' />
        </HStack>
      </HStack>
    )
  }

  if (isAddressWithoutAsset) {
    return (
      <Box py={2}>
        <HStack justify='space-between' align='flex-start'>
          <RawText color='text.subtle' fontSize='sm'>
            {name}
          </RawText>
          <ExpandableAddressCell address={valueString} />
        </HStack>
      </Box>
    )
  }

  return (
    <HStack justify='space-between' align='center' py={2}>
      <RawText color='text.subtle' fontSize='sm'>
        {name}
      </RawText>
      <RawText fontSize='sm'>
        {valueString.length > 30 ? (
          <MiddleEllipsis value={valueString} fontSize='sm' />
        ) : (
          valueString
        )}
      </RawText>
    </HStack>
  )
}

type DomainSectionProps = {
  domain: TypedDataDomain
}

const DomainSection: React.FC<DomainSectionProps> = ({ domain }) => {
  const translate = useTranslate()
  const cardBg = useColorModeValue('white', 'whiteAlpha.50')

  const domainChainId = useMemo(() => {
    if (!domain.chainId) return

    try {
      return toChainId({
        chainNamespace: CHAIN_NAMESPACE.Evm,
        chainReference: String(domain.chainId) as ChainReference,
      })
    } catch {
      // This shouldn't happen, as this should be an evm networkId we support but...
      return
    }
  }, [domain.chainId])

  const domainFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, domainChainId ?? ''),
  )

  const contractExplorerLink = useMemo(() => {
    if (!domainFeeAsset) return
    if (!domain.verifyingContract) return

    return `${domainFeeAsset.explorerAddressLink}${domain.verifyingContract}`
  }, [domain?.verifyingContract, domainFeeAsset])

  return (
    <Card bg={cardBg} borderRadius='2xl' p={4}>
      <VStack align='stretch' spacing={1}>
        {domain.verifyingContract && (
          <HStack justify='space-between' align='center' py={2}>
            <RawText color='text.subtle' fontSize='sm'>
              {translate('plugins.walletConnectToDapps.modal.signMessage.contract')}
            </RawText>
            <HStack spacing={2} align='center'>
              <RawText fontSize='sm'>
                {domain.name || <MiddleEllipsis value={domain.verifyingContract} />}
              </RawText>
              {contractExplorerLink && (
                <ExternalLinkButton
                  href={contractExplorerLink}
                  ariaLabel='View contract on explorer'
                />
              )}
            </HStack>
          </HStack>
        )}
        {domainFeeAsset && (
          <HStack justify='space-between' align='center' py={2}>
            <RawText color='text.subtle' fontSize='sm'>
              {translate('common.network')}
            </RawText>
            <HStack spacing={2} align='center'>
              <RawText fontSize='sm'>{domainFeeAsset.networkName}</RawText>
              <Image boxSize='16px' src={domainFeeAsset.networkIcon ?? domainFeeAsset.icon} />
            </HStack>
          </HStack>
        )}
      </VStack>
    </Card>
  )
}

type EIP712MessageDisplayProps = {
  typedData: string
  chainId?: string
}

export const EIP712MessageDisplay: React.FC<EIP712MessageDisplayProps> = ({
  typedData,
  chainId,
}) => {
  const translate = useTranslate()
  const cardBg = useColorModeValue('white', 'whiteAlpha.50')

  const parsedData = useMemo((): EIP712TypedData | null => {
    try {
      const parsed = JSON.parse(typedData)
      validateTypedData(parsed)
      return parsed as EIP712TypedData
    } catch {
      return null
    }
  }, [typedData])

  if (!parsedData) {
    return (
      <Card bg={cardBg} borderRadius='2xl' p={4}>
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
        <Card bg={cardBg} borderRadius='2xl' p={4}>
          <VStack align='stretch' spacing={1}>
            <MessageField
              name={translate('plugins.walletConnectToDapps.modal.signMessage.primaryType')}
              value={primaryType}
              chainId={chainId}
            />
            {Object.entries(message).map(([key, value]) => (
              <MessageField key={key} name={key} value={value} chainId={chainId} />
            ))}
          </VStack>
        </Card>
      </ModalSection>
    </>
  )
}
