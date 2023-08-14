import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  ButtonGroup,
  FormControl,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
} from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { debounce } from 'lodash'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FaSlidersH } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { selectSlippagePreferencePercentage } from 'state/slices/swappersSlice/selectors'
import { swappers } from 'state/slices/swappersSlice/swappersSlice'
import { selectQuoteOrDefaultSlippagePercentage } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

enum SlippageType {
  Auto = 'Auto',
  Custom = 'Custom',
}

const maxSlippagePercentage = '30'

const focusStyle = { '&[aria-invalid=true]': { borderColor: 'red.500' } }

export const SlippagePopover: FC = () => {
  const defaultSlippagePercentage = useAppSelector(selectQuoteOrDefaultSlippagePercentage)
  const userSlippagePercentage = useAppSelector(selectSlippagePreferencePercentage)

  const [slippageType, setSlippageType] = useState<SlippageType>(SlippageType.Auto)
  const [slippageAmount, setSlippageAmount] = useState(defaultSlippagePercentage)
  const [isInvalid, setIsInvalid] = useState(false)
  const translate = useTranslate()
  const inputRef = useRef<HTMLInputElement>(null)
  const isAdvancedSlippageEnabled = useFeatureFlag('AdvancedSlippage')
  const dispatch = useAppDispatch()

  useEffect(() => {
    // Handles re-opening the slippage popover and/or going back to input step
    if (userSlippagePercentage) setSlippageType(SlippageType.Custom)
    else setSlippageType(SlippageType.Auto)
    // We only want this to run on mount, not to be reactive
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const handleDebounce = useCallback(
    (value: string) => {
      setSlippageAmount(value)
      dispatch(swappers.actions.setSlippagePreferencePercentage(value))
    },
    [dispatch],
  )
  const debounceFnc = useMemo(() => debounce(handleDebounce, 100), [handleDebounce])

  const handleChange = useCallback(
    (value: string) => {
      if (bnOrZero(value).gt(maxSlippagePercentage)) {
        setIsInvalid(true)
      } else {
        debounceFnc(value)
        setIsInvalid(false)
      }
      dispatch(swappers.actions.setSlippagePreferencePercentage(value))
      setSlippageType(SlippageType.Custom)
    },
    [debounceFnc, dispatch],
  )

  useEffect(() => {
    if (slippageType === SlippageType.Auto) {
      setSlippageAmount(defaultSlippagePercentage)
    } else {
      setSlippageAmount(userSlippagePercentage ?? defaultSlippagePercentage)
    }
  }, [defaultSlippagePercentage, slippageType, userSlippagePercentage])

  const handleSlippageTypeChange = useCallback(
    (type: SlippageType) => {
      if (type === SlippageType.Auto) {
        setSlippageAmount(defaultSlippagePercentage)
        setIsInvalid(false)
      } else {
        inputRef && inputRef.current && inputRef.current.focus()
      }
      setSlippageType(type)
    },
    [defaultSlippagePercentage],
  )

  const isHighSlippage = useMemo(() => bnOrZero(slippageAmount).gt(1), [slippageAmount])
  const isLowSlippage = useMemo(() => bnOrZero(slippageAmount).lt(0.05), [slippageAmount])

  if (!isAdvancedSlippageEnabled) return null

  return (
    <Popover placement='bottom-end'>
      <PopoverTrigger>
        <IconButton aria-label='Trade Settings' icon={<FaSlidersH />} variant='ghost' />
      </PopoverTrigger>
      <PopoverContent>
        <PopoverBody>
          <Row>
            <Row.Label>
              <HelperTooltip label={translate('trade.slippageInfo')}>
                <Text translation='trade.slippage.maxSlippage' />
              </HelperTooltip>
            </Row.Label>
            <Row.Value>{slippageType === SlippageType.Auto && 'Auto'}</Row.Value>
          </Row>
          <Row py={2} gap={2} mt={2}>
            <Row.Value>
              <ButtonGroup
                size='sm'
                bg='background.input.base'
                px={1}
                py={1}
                borderRadius='xl'
                variant='ghost'
              >
                <Button
                  onClick={() => handleSlippageTypeChange(SlippageType.Auto)}
                  isActive={slippageType === SlippageType.Auto}
                >
                  {translate('trade.slippage.auto')}
                </Button>
                <Button
                  onClick={() => handleSlippageTypeChange(SlippageType.Custom)}
                  isActive={slippageType === SlippageType.Custom}
                >
                  {translate('trade.slippage.custom')}
                </Button>
              </ButtonGroup>
            </Row.Value>
            <Row.Value>
              <FormControl isInvalid={isInvalid}>
                <InputGroup variant='filled'>
                  <Input
                    placeholder={slippageAmount}
                    value={
                      slippageType === SlippageType.Auto ? slippageAmount : userSlippagePercentage
                    }
                    type='number'
                    _focus={focusStyle}
                    onChange={e => handleChange(e.target.value)}
                    ref={inputRef}
                    isDisabled={slippageType === SlippageType.Auto}
                  />
                  <InputRightElement>%</InputRightElement>
                </InputGroup>
              </FormControl>
            </Row.Value>
          </Row>
          {isHighSlippage && (
            <Alert mt={2} fontSize='sm' status='warning' bg='transparent' px={0} py={0}>
              <AlertIcon />
              <AlertDescription lineHeight='1.5'>
                {translate('trade.slippage.warning')}
              </AlertDescription>
            </Alert>
          )}
          {isLowSlippage && (
            <Alert mt={2} fontSize='sm' status='warning' bg='transparent' px={0} py={0}>
              <AlertIcon />
              <AlertDescription lineHeight='1.5'>
                {translate('trade.slippage.lowSlippage')}
              </AlertDescription>
            </Alert>
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}
