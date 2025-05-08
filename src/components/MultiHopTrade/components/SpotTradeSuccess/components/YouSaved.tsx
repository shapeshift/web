import { Card, Flex, HStack, Icon } from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import type { Asset } from '@shapeshiftoss/types'
import type { Options } from 'canvas-confetti'
import type { CSSProperties } from 'react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import ReactCanvasConfetti from 'react-canvas-confetti'
import type { TCanvasConfettiInstance } from 'react-canvas-confetti/dist/types'
import { TbBolt } from 'react-icons/tb'

import { Amount } from '@/components/Amount/Amount'
import { RawText, Text } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'

const confettiStyle: CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  width: '100%',
  height: '100%',
  top: 0,
  left: 0,
}

const animatedGradient = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`

type YouSavedProps = {
  totalUpsideCryptoPrecision: string
  totalUpsidePercentage: string
  sellAsset: Asset
  buyAsset: Asset
}

export const YouSaved = ({
  totalUpsideCryptoPrecision,
  totalUpsidePercentage,
  sellAsset,
  buyAsset,
}: YouSavedProps) => {
  const cardRef = useRef<HTMLDivElement>(null)

  const refAnimationInstance = useRef<TCanvasConfettiInstance | null>(null)
  const getInstance = useCallback(({ confetti }: { confetti: TCanvasConfettiInstance }) => {
    refAnimationInstance.current = confetti
  }, [])

  const makeShot = useCallback((particleRatio: number, opts: Partial<Options>) => {
    if (refAnimationInstance.current && cardRef.current) {
      const windowHeight = window.innerHeight
      const windowWidth = window.innerWidth

      const cardRect = cardRef.current.getBoundingClientRect()

      const originY = (cardRect.top + cardRect.height / 2) / windowHeight
      const originX = (cardRect.left + cardRect.width / 2) / windowWidth

      refAnimationInstance.current({
        ...opts,
        origin: { y: originY, x: originX },
        particleCount: Math.floor(200 * particleRatio),
      })
    }
  }, [])

  useEffect(() => {
    // Fire confetti on mount
    makeShot(1.0, {
      spread: 80,
      startVelocity: 35,
      decay: 0.92,
      scalar: 1.2,
      drift: 0.2,
    })
  }, [makeShot])

  const formattedPercentage = useMemo(() => {
    return `+${bnOrZero(totalUpsidePercentage).toFixed(2)}%`
  }, [totalUpsidePercentage])

  const pair = useMemo(() => {
    return `${sellAsset.symbol}/${buyAsset.symbol}`
  }, [sellAsset, buyAsset])

  const youGotMoreTranslationComponents = useMemo(
    () => ({
      cryptoUpside: (
        <Amount.Crypto
          as='span'
          value={bnOrZero(totalUpsideCryptoPrecision).toFixed(buyAsset.precision)}
          symbol={buyAsset.symbol}
        />
      ),
    }),
    [buyAsset.precision, buyAsset.symbol, totalUpsideCryptoPrecision],
  )

  const cardSx = useMemo(
    () => ({
      background: `linear-gradient(-45deg, var(--chakra-colors-blue-500), var(--chakra-colors-pink-500), var(--chakra-colors-blue-500), var(--chakra-colors-pink-500))`,
      backgroundSize: '400% 400%',
      animation: `${animatedGradient} 15s ease infinite`,
    }),
    [],
  )

  return (
    <>
      <Card ref={cardRef} width='full' borderRadius='xl' p={4} pl={3} sx={cardSx}>
        <Flex justifyContent='space-between' alignItems='center'>
          <HStack maxWidth='65%'>
            <Icon as={TbBolt} boxSize={8} color='white' />
            <Text
              translation='trade.foxSavings.youGotMore'
              textAlign='left'
              color='white'
              components={youGotMoreTranslationComponents}
              fontSize='md'
              fontWeight='medium'
            />
          </HStack>
          <Flex direction='column' alignItems='flex-end'>
            <RawText color='white' fontSize='2xl' fontWeight='medium'>
              {formattedPercentage}
            </RawText>
            <RawText color='whiteAlpha.700' fontWeight='medium' fontSize='sm'>
              {pair}
            </RawText>
          </Flex>
        </Flex>
      </Card>
      <ReactCanvasConfetti onInit={getInstance} style={confettiStyle} />
    </>
  )
}
