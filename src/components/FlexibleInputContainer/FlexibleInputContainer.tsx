import type { InputProps } from '@chakra-ui/react'
import { Box, Input } from '@chakra-ui/react'
import type * as CSS from 'csstype'
import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'

const wrapperStyles: CSS.Properties = {
  position: 'relative',
  overflow: 'hidden',
  maxWidth: 'calc(100vw - 48px)',
}

const scaledStyles: CSS.Properties = {
  textAlign: 'center',
  transformOrigin: 'left center',
}

const inputStyles: CSS.Properties = {
  fontSize: 'inherit',
  fontFamily: 'inherit',
  minWidth: '100%',
}

const referenceStyles: CSS.Properties = {
  position: 'absolute',
  visibility: 'hidden',
  height: 'auto',
  width: 'auto',
  whiteSpace: 'nowrap',
}

const getScale = (samplerWidth: number, containerWidth: number): number => {
  return Math.min((containerWidth - 1) / samplerWidth, 1)
}

export const FlexibleInputContainer: FC<InputProps> = props => {
  const [transform, setTransform] = useState('scale(1)')
  const [width, setWidth] = useState('0px')
  const referenceContainer = useRef<HTMLDivElement>(null)
  const scaledContainer = useRef<HTMLDivElement>(null)

  const updateScale = (): void => {
    if (referenceContainer.current && scaledContainer.current) {
      const scale = getScale(
        referenceContainer.current.clientWidth,
        scaledContainer.current.clientWidth,
      )
      setTransform(`scale(${scale})`)
      setWidth(`${referenceContainer.current.clientWidth}px`)
    }
  }

  useEffect(() => {
    if (typeof ResizeObserver !== 'undefined' && ResizeObserver && scaledContainer.current) {
      const scaledContainerRef = scaledContainer.current
      const resizeObserver = new ResizeObserver(updateScale)
      resizeObserver.observe(scaledContainerRef)

      return () => resizeObserver.unobserve(scaledContainerRef)
    }
  }, [scaledContainer])

  useEffect(updateScale, [props.value])

  return (
    <Box fontSize={props.fontSize} style={wrapperStyles}>
      <Box ref={scaledContainer} style={{ transform, ...scaledStyles }}>
        <Input style={{ width, ...inputStyles }} {...props} />
        <Box ref={referenceContainer} style={referenceStyles}>
          {props.value}
        </Box>
      </Box>
    </Box>
  )
}
