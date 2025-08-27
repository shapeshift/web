import { ExternalLinkIcon } from '@chakra-ui/icons'
import { HStack, Icon, Link } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import { middleEllipsis } from '@/lib/utils'

type ChangeAddressRowProps = {
  explorerAddressLink: string
  changeAddress: string
}

export const ChangeAddressRow = ({ explorerAddressLink, changeAddress }: ChangeAddressRowProps) => {
  const translate = useTranslate()

  const tooltipBody = useCallback(
    () => <RawText>{translate('trade.utxoChangeAddressTooltip')}</RawText>,
    [translate],
  )

  return (
    <Row Tooltipbody={tooltipBody}>
      <Row.Label>
        <Text translation='trade.utxoChangeAddress' />
      </Row.Label>
      <Row.Value>
        <HStack>
          <RawText>{middleEllipsis(changeAddress)}</RawText>
          <Link
            href={`${explorerAddressLink}${changeAddress}`}
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
