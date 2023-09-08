import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import {
  Card,
  CardBody,
  CardHeader,
  Collapse,
  Divider,
  Flex,
  Heading,
  Stack,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import type { FC } from 'react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { Row } from 'components/Row/Row'
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
  const { isOpen, onToggle } = useDisclosure()
  const translate = useTranslate()
  const asset = useAppSelector(s => selectFeeAssetByChainId(s, chainId))
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
    <Card
      borderColor={borderColor}
      overflow='hidden'
      width='full'
      borderRadius={{ base: 'lg', md: 'xl' }}
    >
      <CardHeader
        px={{ base: 4, md: 4 }}
        display='flex'
        alignItems='center'
        justifyContent='space-between'
        onClick={onToggle}
        cursor='pointer'
        _hover={{ bg: useColorModeValue('blackAlpha.50', 'whiteAlpha.50') }}
      >
        <Heading display='flex' alignItems='center' gap={2}>
          <AssetIcon src={asset?.networkIcon ?? asset?.icon} size='xs' />
          {asset?.networkName ?? asset?.name}
        </Heading>
        <Flex gap={2} alignItems='center'>
          <Tag>{chainNamespace}</Tag>
          {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Flex>
      </CardHeader>
      <Collapse in={isOpen}>
        <CardBody p={{ base: 0, md: 0 }} bg='whiteAlpha.50'>
          <Stack spacing={0} divider={<Divider />}>
            <Row gap={4} variant='gutter' py={3}>
              <Row.Label>{translate(translateKey('methods'))}</Row.Label>
              <Row.Value display='flex' gap={2} flexWrap='wrap' justifyContent='flex-end'>
                {renderMethods}
              </Row.Value>
            </Row>
            <Row gap={4} variant='gutter' py={3}>
              <Row.Label>{translate(translateKey('events'))}</Row.Label>
              <Row.Value display='flex' gap={4} flexWrap='wrap' justifyContent='flex-end'>
                {renderEvents}
              </Row.Value>
            </Row>
            <AccountSelectionByChainId
              chainId={chainId}
              toggleAccountId={toggleAccountId}
              selectedAccountIds={selectedAccountIds}
            />
          </Stack>
        </CardBody>
      </Collapse>
    </Card>
  )
}
