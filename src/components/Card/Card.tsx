import type { BoxProps, ThemingProps } from '@chakra-ui/react'
import { Box, createStylesContext, useMultiStyleConfig } from '@chakra-ui/react'

export type CardProps = BoxProps & ThemingProps

const [StylesProvider, useStyles] = createStylesContext('Card')

export const Card = (props: CardProps) => {
  const { size, variant, children, ...rest } = props
  const styles = useMultiStyleConfig('Card', { size, variant })
  return (
    <Box __css={styles.card} {...rest}>
      <StylesProvider value={styles}>{children}</StylesProvider>
    </Box>
  )
}

const Header = (props: BoxProps) => {
  const styles = useStyles()
  return <Box __css={styles.header} {...props} />
}

const HeadingText = (props: BoxProps) => {
  const styles = useStyles()
  return <Box __css={styles.heading} {...props} />
}

const Body = (props: BoxProps) => {
  const styles = useStyles()
  return <Box __css={styles.body} {...props} />
}

const Footer = (props: BoxProps) => {
  const styles = useStyles()
  return <Box __css={styles.footer} {...props} />
}

Card.Header = Header
Card.Heading = HeadingText
Card.Body = Body
Card.Footer = Footer
