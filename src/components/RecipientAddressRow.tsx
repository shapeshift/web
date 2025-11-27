import { ExternalLinkIcon } from '@chakra-ui/icons'
import { HStack, Icon, Link } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import { middleEllipsis } from '@/lib/utils'

type RecipientAddressRowProps = {
  explorerAddressLink: string
  receiveAddress: string
}

export const RecipientAddressRow = ({
  explorerAddressLink,
  receiveAddress,
}: RecipientAddressRowProps) => {
  const translate = useTranslate()
  return (
    <Row>
      <Row.Label>
        <Text translation='trade.recipientAddress' />
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
