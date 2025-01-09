import { Button, Card, HStack } from '@chakra-ui/react'
import type { Options } from 'canvas-confetti'
import { useCallback, useRef } from 'react'
import ReactCanvasConfetti from 'react-canvas-confetti'
import type { TCanvasConfettiInstance } from 'react-canvas-confetti/dist/types'
import { useTranslate } from 'react-polyglot'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { Text } from 'components/Text'

const foxIcon = <FoxIcon w='full' h='full' />

export const YouSaved = () => {
  const translate = useTranslate()

  const refAnimationInstance = useRef<TCanvasConfettiInstance | null>(null)
  const getInstance = useCallback(({ confetti }: { confetti: TCanvasConfettiInstance }) => {
    refAnimationInstance.current = confetti
  }, [])

  const makeShot = useCallback((particleRatio: number, opts: Partial<Options>) => {
    if (refAnimationInstance.current) {
      refAnimationInstance.current({
        ...opts,
        origin: { y: 0.7 },
        particleCount: Math.floor(200 * particleRatio),
      })
    }
  }, [])

  const fire = useCallback(() => {
    makeShot(0.25, {
      spread: 26,
      startVelocity: 55,
    })

    makeShot(0.2, {
      spread: 60,
    })

    makeShot(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    })

    makeShot(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    })

    makeShot(0.1, {
      spread: 120,
      startVelocity: 45,
    })
  }, [makeShot])

  const handleClick = useCallback(() => {
    // TEMP: Test out confetti
    fire()

    // TODO:
    // Set fox as the buy asset
    // Redirect to trade page
  }, [fire])

  return (
    <>
      <Card
        width='full'
        bg='background.surface.overlay.base'
        borderBottomRadius='lg'
        p={4}
        borderColor='border.base'
        borderWidth={2}
      >
        <HStack width='full' justifyContent='space-between'>
          <Text translation='trade.foxSavings.youSaved' fontSize='sm' fontWeight='bold' />
          <Button
            leftIcon={foxIcon}
            colorScheme='gray'
            size='sm'
            fontSize='sm'
            fontWeight='bold'
            aria-label='Copy value'
            onClick={handleClick}
            borderRadius='full'
            borderColor='border.base'
            borderWidth={2}
            px={4}
          >
            {translate('trade.foxSavings.buyFox')}
          </Button>
        </HStack>
      </Card>
      <ReactCanvasConfetti
        onInit={getInstance}
        style={{
          position: 'fixed',
          pointerEvents: 'none',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
        }}
      />
    </>
  )
}
