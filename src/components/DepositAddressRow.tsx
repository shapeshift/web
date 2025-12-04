import { ExternalLinkIcon } from '@chakra-ui/icons'
import { HStack, Icon, Link } from '@chakra-ui/react'
import { TbBuildingBank } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import { middleEllipsis } from '@/lib/utils'

type DepositAddressRowProps = {
  explorerAddressLink: string
  depositAddress: string
}

export const DepositAddressRow = ({
  explorerAddressLink,
  depositAddress,
}: DepositAddressRowProps) => {
  const translate = useTranslate()
  return (
    <Row>
      <Row.Label>
        <HelperTooltip label={translate('trade.depositAddressExplainer')}>
          <HStack spacing={2}>
            <Icon as={TbBuildingBank} />
            <Text translation='trade.depositAddress' />
          </HStack>
        </HelperTooltip>
      </Row.Label>
      <Row.Value>
        <HStack>
          <RawText>{middleEllipsis(depositAddress)}</RawText>
          <Link
            href={`${explorerAddressLink}${depositAddress}`}
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
