import { Button, Card, HStack } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo, useRef } from 'react'
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

type YouSavedProps = { affiliateFeeUserCurrency: string }

export const YouCouldHaveSaved = ({ affiliateFeeUserCurrency }: YouSavedProps) => {
  const history = useHistory()
  const translate = useTranslate()
  const cardRef = useRef<HTMLDivElement>(null)
  const dispatch = useAppDispatch()

  const foxAsset = useSelectorWithArgs(selectAssetById, foxAssetId)

  const {
    number: { toFiat },
  } = useLocaleFormatter()

  const handleClick = useCallback(() => {
    if (!foxAsset) return

    dispatch(tradeInput.actions.setBuyAsset(foxAsset))

    history.push(TradeRoutePaths.Input)
  }, [dispatch, foxAsset, history])

  const affiliateFeeUserCurrencyFormatted = useMemo(() => {
    return toFiat(affiliateFeeUserCurrency)
  }, [toFiat, affiliateFeeUserCurrency])

  const youSavedTranslationProps = useMemo(() => {
    return [
      'trade.foxSavings.youCouldHaveSaved',
      { fee: affiliateFeeUserCurrencyFormatted },
    ] as TextPropTypes['translation']
  }, [affiliateFeeUserCurrencyFormatted])

  return (
    <>
      <Card
        ref={cardRef}
        width='full'
        bg='background.surface.overlay.base'
        borderRadius='xl'
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
            px={5}
          >
            {translate('trade.foxSavings.buyFox')}
          </Button>
        </HStack>
      </Card>
    </>
  )
}
