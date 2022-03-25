import { Button, ButtonProps, Tooltip } from '@chakra-ui/react'
import { useEffect } from 'react'
import { useRef, useState } from 'react'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'

type TokenButtonProps = {
  logo: string
  symbol: string
} & ButtonProps

export const TokenButton = ({ logo, symbol, ...rest }: TokenButtonProps) => {
  const textRef = useRef<HTMLDivElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useEffect(() => {
    const width = textRef.current ? textRef.current.offsetWidth : 0
    const scrollWidth = textRef.current ? textRef.current.scrollWidth : 0
    setIsTruncated(width < scrollWidth)
  }, [textRef])

  return (
    <Tooltip label={symbol} isDisabled={!isTruncated}>
      <Button
        variant='ghost'
        width='6.5rem'
        px={2}
        leftIcon={<AssetIcon boxSize='20px' src={logo} />}
        {...rest}
      >
        <RawText isTruncated ref={textRef}>
          {symbol}
        </RawText>
      </Button>
    </Tooltip>
  )
}
