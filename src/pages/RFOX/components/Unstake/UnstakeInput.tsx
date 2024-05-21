import { Button, CardFooter, Collapse, Stack } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AmountSlider } from 'components/AmountSlider'
import { FormDivider } from 'components/FormDivider'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { WarningAcknowledgement } from 'components/WarningAcknowledgement/WarningAcknowledgement'
import { ReadOnlyAsset } from 'pages/ThorChainLP/components/ReadOnlyAsset'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { UnstakeSummary } from './components/UnstakeSummary'
import type { UnstakeRouteProps } from './types'
import { UnstakeRoutePaths } from './types'

const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 4,
  paddingTop: 0,
}

export const UnstakeInput: React.FC<UnstakeRouteProps> = ({ headerComponent }) => {
  const translate = useTranslate()
  const history = useHistory()
  const asset = useAppSelector(state => selectAssetById(state, foxAssetId))
  const [showWarning, setShowWarning] = useState(false)
  const percentOptions = useMemo(() => [], [])
  const [cryptoAmount, setCryptoAmount] = useState('')
  const [fiatAmount, setFiatAmount] = useState('')
  const [sliderValue, setSliderValue] = useState<number>(0)
  const [percentageSelection, setPercentageSelection] = useState<number>(50)

  const handleAccountIdChange = useCallback(() => {}, [])

  // @TODO: Need to add a fiat toggle for the input field
  const hasEnteredValue = useMemo(() => sliderValue > 0, [sliderValue])

  const handleChange = useCallback((value: string, isFiat?: boolean) => {
    if (isFiat) {
      setFiatAmount(value)
    } else {
      setCryptoAmount(value)
    }
  }, [])

  const handleWarning = useCallback(() => {
    setShowWarning(true)
  }, [])

  const handleSubmit = useCallback(() => {
    history.push(UnstakeRoutePaths.Confirm)
  }, [history])

  const handlePercentageSliderChange = useCallback(
    (percentage: number) => {
      setSliderValue(percentage)
    },
    [setSliderValue],
  )
  const handlePercentageSliderChangeEnd = useCallback(
    (percentage: number) => {
      setSliderValue(percentage)
      setPercentageSelection(percentage)
    },
    [setPercentageSelection, setSliderValue],
  )
  const handlePercentageClick = useCallback((percentage: number) => {
    setSliderValue(percentage)
    setPercentageSelection(percentage)
  }, [])

  // @TODO: Remove once wired up, just here to make lint happy
  useEffect(() => {
    console.info(percentageSelection)
  }, [percentageSelection])

  if (!asset) return null

  return (
    <SlideTransition>
      <WarningAcknowledgement
        message={translate('RFOX.unstakeWarning', {
          cooldownPeriod: '28-day',
        })}
        onAcknowledge={handleSubmit}
        shouldShowWarningAcknowledgement={showWarning}
        setShouldShowWarningAcknowledgement={setShowWarning}
      >
        <Stack>
          {headerComponent}
          <AmountSlider
            sliderValue={sliderValue}
            handlePercentageSliderChange={handlePercentageSliderChange}
            onPercentageClick={handlePercentageClick}
            handlePercentageSliderChangeEnd={handlePercentageSliderChangeEnd}
          />
          <FormDivider />
          <TradeAssetInput
            assetId={asset?.assetId}
            assetSymbol={asset?.symbol ?? ''}
            assetIcon={asset?.icon ?? ''}
            percentOptions={percentOptions}
            onAccountIdChange={handleAccountIdChange}
            formControlProps={formControlProps}
            isAccountSelectionDisabled
            isSendMaxDisabled={true}
            onChange={handleChange}
            rightComponent={ReadOnlyAsset}
            cryptoAmount={cryptoAmount}
            fiatAmount={fiatAmount}
            isReadOnly
          />

          <Collapse in={hasEnteredValue}>
            <UnstakeSummary assetId={asset.assetId} />
            <CardFooter
              borderTopWidth={1}
              borderColor='border.subtle'
              flexDir='column'
              gap={4}
              px={6}
              py={4}
              bg='background.surface.raised.accent'
            >
              <Row fontSize='sm' fontWeight='medium'>
                <Row.Label>{translate('common.gasFee')}</Row.Label>
                <Row.Value>
                  <Amount.Fiat value='10' />
                </Row.Value>
              </Row>
              <Row fontSize='sm' fontWeight='medium'>
                <Row.Label>{translate('common.fees')}</Row.Label>
                <Row.Value>
                  <Amount.Fiat value='0.0' />
                </Row.Value>
              </Row>
            </CardFooter>
          </Collapse>
        </Stack>
        <CardFooter
          borderTopWidth={1}
          borderColor='border.subtle'
          flexDir='column'
          gap={4}
          px={6}
          bg='background.surface.raised.accent'
          borderBottomRadius='xl'
        >
          <Button
            size='lg'
            mx={-2}
            onClick={handleWarning}
            colorScheme='blue'
            isDisabled={!hasEnteredValue}
          >
            {translate('RFOX.unstake')}
          </Button>
        </CardFooter>
      </WarningAcknowledgement>
    </SlideTransition>
  )
}
