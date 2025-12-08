import { ExternalLinkIcon } from '@chakra-ui/icons'
import { HStack, Icon, Link } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import { middleEllipsis } from '@/lib/utils'

type ReceiveAddressRowProps = {
  explorerAddressLink: string
  receiveAddress: string
}

export const ReceiveAddressRow = ({
  explorerAddressLink,
  receiveAddress,
}: ReceiveAddressRowProps) => {
  const translate = useTranslate()
  return (
    <Row>
      <Row.Label>
        <Text translation='trade.receiveAddress' />
      </Row.Label>
      <Row.Value>
        <HStack>
          <RawText>{middleEllipsis(receiveAddress)}</RawText>
          <Link
            href={`${explorerAddressLink}${receiveAddress}`}
            isExternal
            aria-label={translate('common.viewOnExplorer')}
          >
            <Icon as={ExternalLinkIcon} />
          </Link>
        </HStack>
      </Row.Value>
    </Row>
  )
}
