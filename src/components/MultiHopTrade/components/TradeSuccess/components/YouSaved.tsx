import { Button, Card, HStack } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import type { Options } from 'canvas-confetti'
import type { CSSProperties } from 'react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import ReactCanvasConfetti from 'react-canvas-confetti'
import type { TCanvasConfettiInstance } from 'react-canvas-confetti/dist/types'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { selectAssetById } from 'state/slices/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useSelectorWithArgs } from 'state/store'

const foxIcon = <FoxIcon w='full' h='full' />

const confettiStyle: CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  width: '100%',
  height: '100%',
  top: 0,
  left: 0,
}

type YouSavedProps = { feeSavingUserCurrency: string }

export const YouSaved = ({ feeSavingUserCurrency }: YouSavedProps) => {
  const history = useHistory()
  const translate = useTranslate()
  const cardRef = useRef<HTMLDivElement>(null)
  const dispatch = useAppDispatch()

  const fox = useSelectorWithArgs(selectAssetById, foxAssetId)

  const {
    number: { toFiat },
  } = useLocaleFormatter()

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

  const handleClick = useCallback(() => {
    if (!fox) return

    // Set fox as the buy asset
    dispatch(tradeInput.actions.setBuyAsset(fox))

    // Redirect to trade input page
    history.push(TradeRoutePaths.Input)
  }, [dispatch, fox, history])

  const feeSavingUserCurrencyFormatted = useMemo(() => {
    return toFiat(feeSavingUserCurrency)
  }, [toFiat, feeSavingUserCurrency])

  const youSavedTranslationProps = useMemo(() => {
    return [
      'trade.foxSavings.youSaved',
      { feeSaving: feeSavingUserCurrencyFormatted },
    ] as TextPropTypes['translation']
  }, [feeSavingUserCurrencyFormatted])

  return (
    <>
      <Card
        ref={cardRef}
        width='full'
        bg='background.surface.overlay.base'
        borderBottomRadius='lg'
        p={4}
        borderColor='border.base'
        borderWidth={2}
      >
        <HStack width='full' justifyContent='space-between'>
          <Text translation={youSavedTranslationProps} fontSize='sm' fontWeight='bold' />
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
      <ReactCanvasConfetti onInit={getInstance} style={confettiStyle} />
    </>
  )
}
