import type { BoxProps } from '@chakra-ui/react'
import { Row as RowStyle } from 'components/Row/Row'
import { Text } from 'components/Text'

export const Row = ({
  title,
  children,
  ...rest
}: { title: string; children: React.ReactNode } & BoxProps) => {
  return (
    <RowStyle alignItems='center' {...rest}>
      <RowStyle.Label>
        <Text translation={`transactionHistory.${title}`} />
      </RowStyle.Label>
      <RowStyle.Value>{children}</RowStyle.Value>
    </RowStyle>
  )
}
