import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import { Collapse, Divider, Stack, useColorModeValue, useDisclosure } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import type { FC } from 'react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Row } from 'components/Row/Row'
import { RawText } from 'components/Text'
import { selectFeeAssetByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AccountSelectionByChainId } from './AccountSelectionByChainId'

type ChainReferenceCardProps = {
  methods: string[]
  events: string[]
  chainNamespace: string
  chainId: string
  selectedAccountIds: string[]
  toggleAccountId: (accountId: string) => void
}

export const ChainReferenceCard: FC<ChainReferenceCardProps> = ({
  methods,
  events,
  chainId,
  chainNamespace,
  selectedAccountIds,
  toggleAccountId,
}) => {
  const translate = useTranslate()
  const { isOpen, onToggle } = useDisclosure()
  const asset = useAppSelector(s => selectFeeAssetByChainId(s, chainId))
  const hoverBg = useColorModeValue('blackAlpha.100', 'whiteAlpha.50')
  const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.200')
  const translateKey = (key: string) => `plugins.walletConnectToDapps.modal.sessionProposal.${key}`

  const renderEvents = useMemo(() => {
    return events.map(event => (
      <Tag key={event} colorScheme='yellow' variant='subtle'>
        {event}
      </Tag>
    ))
  }, [events])

  const renderMethods = useMemo(() => {
    return methods.map(method => (
      <Tag key={method} colorScheme='green' variant='subtle'>
        {method}
      </Tag>
    ))
  }, [methods])
  return (
    <Card borderColor={borderColor} overflow='hidden'>
      <Card.Header
        px={{ base: 4, md: 4 }}
        display='flex'
        alignItems='center'
        justifyContent='space-between'
      >
        <Card.Heading display='flex' alignItems='center' gap={2}>
          <AssetIcon src={asset?.networkIcon ?? asset?.icon} size='xs' />
          {asset?.networkName ?? asset?.name}
        </Card.Heading>
        <Tag>{chainNamespace}</Tag>
      </Card.Header>
      <Card.Body p={{ base: 0, md: 0 }} bg='whiteAlpha.50'>
        <Stack spacing={0} divider={<Divider />}>
          <Row gap={2} variant='gutter' py={3}>
            <Row.Label>{translate(translateKey('methods'))}</Row.Label>
            <Row.Value display='flex' gap={2} flexWrap='wrap' justifyContent='flex-end'>
              {renderMethods}
            </Row.Value>
          </Row>
          <Row variant='gutter' py={3}>
            <Row.Label>{translate(translateKey('events'))}</Row.Label>
            <Row.Value display='flex' gap={4} flexWrap='wrap' justifyContent='flex-end'>
              {renderEvents}
            </Row.Value>
          </Row>
          <Row
            variant='gutter'
            flexDir='column'
            cursor='pointer'
            _hover={{ bg: hoverBg }}
            py={3}
            gap={2}
            onClick={onToggle}
          >
            <Row alignItems='center'>
              <Row.Label>{translate(translateKey('selectedAccounts'))}</Row.Label>
              <Row.Value fontWeight='semibold' display='flex' gap={2} alignItems='center'>
                <RawText>2 / 4</RawText>
                {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon boxSize={4} />}
              </Row.Value>
            </Row>
            <Collapse in={isOpen}>
              <AccountSelectionByChainId
                chainId={chainId}
                toggleAccountId={toggleAccountId}
                selectedAccountIds={selectedAccountIds}
              />
            </Collapse>
          </Row>
        </Stack>
      </Card.Body>
    </Card>
  )
}
