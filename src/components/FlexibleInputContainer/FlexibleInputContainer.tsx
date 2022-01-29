import { Box, Input, InputProps } from '@chakra-ui/react'
import * as CSS from 'csstype'
import type { FC } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

const wrapperStyles: CSS.Properties = {
  position: 'relative',
  overflow: 'hidden',
  maxWidth: 'calc(100vw - 48px)'
}

const scaledStyles: CSS.Properties = {
  textAlign: 'center',
  transformOrigin: 'left center'
}

const inputStyles: CSS.Properties = {
  minWidth: '100%'
}

const referenceStyles: CSS.Properties = {
  position: 'absolute',
  visibility: 'hidden',
  height: 'auto',
  width: 'auto',
  whiteSpace: 'nowrap'
}

const getScale = (samplerWidth: number, containerWidth: number): number => {
  return Math.min((containerWidth - 1) / samplerWidth, 1)
}

export const FlexibleInputContainer: FC<InputProps> = props => {
  const [transform, setTransform] = useState('scale(1)')
  const [width, setWidth] = useState('0px')
  const referenceContainer = useRef<HTMLDivElement>(null)
  const scaledContainer = useRef<HTMLDivElement>(null)

  const updateScale = useCallback((): void => {
    if (referenceContainer.current && scaledContainer.current) {
      const scale = getScale(
        referenceContainer.current.clientWidth,
        scaledContainer.current.clientWidth
      )
      setTransform(`scale(${scale})`)
      setWidth(scale > 0.99 ? '100%' : `${referenceContainer.current.clientWidth}px`)
    }
  }, [])

  useEffect((): void => {
    if (scaledContainer.current == null || referenceContainer.current == null) {
      return
    }
    const input = scaledContainer.current.querySelector('input')
    const styles = getComputedStyle(input as Element)
    const properties = [
      'border-left',
      'border-right',
      'padding-left',
      'padding-right',
      'padding-inline-start',
      'padding-inline-end',
      'padding-inline-end',
      'font-size',
      'font-family'
    ]
    properties.forEach(property => {
      referenceContainer.current!.style.setProperty(property, styles.getPropertyValue(property))
    })
  }, [scaledContainer])

  useEffect(() => {
    if (typeof ResizeObserver !== 'undefined' && ResizeObserver && scaledContainer.current) {
      const scaledContainerRef = scaledContainer.current
      const resizeObserver = new ResizeObserver(updateScale)
      resizeObserver.observe(scaledContainerRef)

      return () => resizeObserver.unobserve(scaledContainerRef)
    }
  }, [scaledContainer, updateScale])

  useEffect(updateScale, [props.value, updateScale])

  return (
    <Box style={wrapperStyles} flexGrow={props.flexGrow}>
      <Box ref={scaledContainer} style={{ transform, ...scaledStyles }}>
        <Input style={{ width, ...inputStyles }} {...props} />
        <Box ref={referenceContainer} style={referenceStyles}>
          {props.value}
        </Box>
      </Box>
    </Box>
  )
}
