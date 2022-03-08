import { Flex, Link, useMediaQuery } from '@chakra-ui/react'
import { RawText, Text } from 'components/Text'
import { TransactionLink } from 'components/TransactionHistoryRows/TransactionLink'
import { breakpoints } from 'theme/theme'

import { Row } from './Row'

export const TransactionId = ({
  explorerTxLink,
  txid,
  compactMode
}: {
  explorerTxLink: string
  txid: string
  compactMode: boolean
}) => {
  const [isLargerThanLg] = useMediaQuery(`(min-width: ${breakpoints['lg']})`)
  return isLargerThanLg && !compactMode ? (
    <Flex flex={1} flexDir='column' mb={2}>
      <Text translation='transactionHistory.txid' color='gray.600' />
      <Link isExternal color='blue.200' href={`${explorerTxLink}${txid}`}>
        <RawText>{txid}</RawText>
      </Link>
    </Flex>
  ) : (
    <Row title='txid'>
      <TransactionLink explorerTxLink={explorerTxLink} txid={txid} />
    </Row>
  )
}
