import { CheckCircleIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { Tag, useMediaQuery } from '@chakra-ui/react'
import { TxStatus } from '@keepkey/unchained-client'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { breakpoints } from 'theme/theme'

export const Status = ({ status }: { status: TxStatus }) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['lg']})`, { ssr: false })
  const tagSize = isLargerThanMd ? 'lg' : 'md'
  switch (status) {
    case TxStatus.Confirmed:
      return (
        <>
          <Tag colorScheme='green' size={tagSize}>
            <CheckCircleIcon mr={2} />
            <Text translation='transactionRow.confirmed' />
          </Tag>
        </>
      )
    case TxStatus.Pending:
      return (
        <>
          <Tag colorScheme='blue' size={tagSize}>
            <CircularProgress mr={2} size='5' />
            <Text translation='transactionRow.pending' />
          </Tag>
        </>
      )
    case TxStatus.Failed:
    default:
      return (
        <>
          <Tag colorScheme='red' size={tagSize}>
            <WarningTwoIcon mr={2} />
            <Text translation='transactionRow.failed' />
          </Tag>
        </>
      )
  }
}
