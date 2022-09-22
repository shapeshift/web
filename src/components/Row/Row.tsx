import type { BoxProps, ButtonProps, TextProps, ThemingProps } from '@chakra-ui/react'
import { Box, createStylesContext, useMultiStyleConfig } from '@chakra-ui/react'

export type RowProps = BoxProps & ThemingProps & Pick<ButtonProps, 'colorScheme'>

const [StylesProvider, useStyles] = createStylesContext('Row')

export const Row = (props: RowProps) => {
  const { size, variant, colorScheme, children, ...rest } = props
  const styles = useMultiStyleConfig('Row', { size, variant, colorScheme })
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
