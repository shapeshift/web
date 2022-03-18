import { CheckCircleIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { Tag, useMediaQuery } from '@chakra-ui/react'
import { chainAdapters } from '@shapeshiftoss/types'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { breakpoints } from 'theme/theme'

export const Status = ({ status }: { status: chainAdapters.TxStatus }) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['lg']})`)
  const tagSize = isLargerThanMd ? 'lg' : 'md'
  switch (status) {
    case chainAdapters.TxStatus.Confirmed:
      return (
        <>
          <Tag colorScheme='green' size={tagSize}>
            <CheckCircleIcon mr={2} />
            <Text translation='transactionRow.confirmed' />
          </Tag>
        </>
      )
    case chainAdapters.TxStatus.Pending:
      return (
        <>
          <Tag colorScheme='blue' size={tagSize}>
            <CircularProgress mr={2} size='5' />
            <Text translation='transactionRow.pending' />
          </Tag>
        </>
      )
    case chainAdapters.TxStatus.Failed:
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
