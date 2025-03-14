import { ExternalLinkIcon } from '@chakra-ui/icons'
import { HStack, Icon, Link } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'

import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import { middleEllipsis } from '@/lib/utils'

type RecipientAddressRowProps = {
  sellAsset: Asset
  recipientAddress: string | undefined
}

export const RecipientAddressRow = ({ sellAsset, recipientAddress }: RecipientAddressRowProps) => {
  return (
    <Row>
      <Row.Label>
        <Text translation='trade.recipientAddress' />
      </Row.Label>
      <Row.Value>
        <HStack>
          <RawText>{middleEllipsis(recipientAddress ?? '')}</RawText>
          <Link
            href={`${sellAsset.explorerAddressLink}${recipientAddress}`}
            isExternal
            aria-label='View on block explorer'
          >
            <Icon as={ExternalLinkIcon} />
          </Link>
        </HStack>
      </Row.Value>
    </Row>
  )
}
