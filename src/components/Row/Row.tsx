import type { BoxProps, ButtonProps, TextProps, ThemingProps } from '@chakra-ui/react'
import {
  Box,
  createStylesContext,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
  useMultiStyleConfig,
} from '@chakra-ui/react'
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { FiInfo } from 'react-icons/fi'

export type RowProps = { Tooltipbody?: React.FC; isLoading?: boolean } & BoxProps &
  ThemingProps &
  Pick<ButtonProps, 'colorScheme'>

type RowContextProps = {
  isHovered: boolean
  setIsHovered: (hovered: boolean) => void
  Tooltipbody?: React.FC
  isLoading?: boolean
}

const RowContext = createContext<RowContextProps | undefined>(undefined)

const [StylesProvider, useStyles] = createStylesContext('Row')

export const Row = (props: RowProps) => {
  const { size, variant, colorScheme, children, Tooltipbody, isLoading, ...rest } = props
  const styles = useMultiStyleConfig('Row', { size, variant, colorScheme })
  const [isHovered, setIsHovered] = useState(false)
  return (
    <RowContext.Provider value={{ isHovered, setIsHovered, Tooltipbody, isLoading }}>
      <Box __css={styles.row} {...rest}>
        <StylesProvider value={styles}>{children}</StylesProvider>
      </Box>
    </RowContext.Provider>
  )
}

const useRowContext = () => {
  const context = useContext(RowContext)
  if (!context) {
    throw new Error('useRowContext must be used within a row component')
  }
  return context
}

const Label = (props: TextProps) => {
  const styles = useStyles()
  const { children } = props
  const { setIsHovered, Tooltipbody } = useRowContext()

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [setIsHovered])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [setIsHovered])

  const hoverProps = useMemo(() => {
    return {
      cursor: Tooltipbody ? 'help' : 'inherit',
    }
  }, [Tooltipbody])

  return (
    <Box
      __css={styles.label}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      _hover={hoverProps}
      {...props}
    >
      {children}
      {Tooltipbody && (
        <Box as='span' color='text.subtle'>
          <FiInfo />
        </Box>
      )}
    </Box>
  )
}

const popperModifiers = [
  { name: 'preventOverflow', options: { padding: 20 } },
  { name: 'flip', options: { fallbackPlacements: ['top', 'bottom'] } },
]

const Value = (props: TextProps) => {
  const styles = useStyles()
  const { isHovered, setIsHovered, Tooltipbody, isLoading } = useRowContext()

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [setIsHovered])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [setIsHovered])

  const valueContent = useMemo(() => {
    if (!Tooltipbody) return <Box __css={styles.value} {...props} />
    return (
      <Popover placement='right' isOpen={isHovered} modifiers={popperModifiers}>
        <PopoverTrigger>
          <Box
            __css={styles.value}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...props}
          />
        </PopoverTrigger>
        <PopoverContent>
          <PopoverArrow />
          <PopoverBody>
            <Tooltipbody />
          </PopoverBody>
        </PopoverContent>
      </Popover>
    )
  }, [Tooltipbody, handleMouseEnter, handleMouseLeave, isHovered, props, styles.value])

  return <Skeleton isLoaded={!isLoading}>{valueContent}</Skeleton>
}

Row.Label = Label
Row.Value = Value
