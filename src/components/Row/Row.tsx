import {
  Box,
  BoxProps,
  StylesProvider,
  TextProps,
  ThemingProps,
  useMultiStyleConfig,
  useStyles
} from '@chakra-ui/react'

type RowProps = BoxProps & ThemingProps

export const Row = (props: RowProps) => {
  const { size, variant, children, ...rest } = props
  const styles = useMultiStyleConfig('Row', { size, variant })
  return (
    <Box __css={styles.row} {...rest}>
      <StylesProvider value={styles}>{children}</StylesProvider>
    </Box>
  )
}

const Label = (props: BoxProps) => {
  const styles = useStyles()
  return <Box __css={styles.label} {...props} />
}

const Value = (props: TextProps) => {
  const styles = useStyles()
  return <Box __css={styles.value} {...props} />
}

Row.Label = Label
Row.Value = Value
