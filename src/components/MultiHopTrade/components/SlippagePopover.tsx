import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
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
  Tooltip,
} from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { FC } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FaGear } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { selectUserSlippagePercentage } from 'state/slices/tradeInputSlice/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import {
  selectDefaultSlippagePercentage,
  selectQuoteSlippageTolerancePercentage,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

enum SlippageType {
  Auto = 'Auto',
  Custom = 'Custom',
}

const maxSlippagePercentage = '30'

const focusStyle = { '&[aria-invalid=true]': { borderColor: 'red.500' } }

const faGear = <FaGear />

type SlippagePopoverProps = {
  isDisabled?: boolean
  tooltipTranslation?: string
}

export const SlippagePopover: FC<SlippagePopoverProps> = memo(
  ({ tooltipTranslation, isDisabled }) => {
    const defaultSlippagePercentage = useAppSelector(selectDefaultSlippagePercentage)
    const quoteSlippagePercentage = useAppSelector(selectQuoteSlippageTolerancePercentage)

    const userSlippagePercentage = useAppSelector(selectUserSlippagePercentage)

    const [slippageType, setSlippageType] = useState<SlippageType>(SlippageType.Auto)
    const [slippageAmount, setSlippageAmount] = useState<string | undefined>(
      defaultSlippagePercentage,
    )
    const [isInvalid, setIsInvalid] = useState(false)
    const translate = useTranslate()
    const inputRef = useRef<HTMLInputElement>(null)
    const isAdvancedSlippageEnabled = useFeatureFlag('AdvancedSlippage')
    const dispatch = useAppDispatch()

    useEffect(() => {
      // Handles re-opening the slippage popover and/or going back to input step
      if (userSlippagePercentage) {
        setSlippageType(SlippageType.Custom)
        setSlippageAmount(userSlippagePercentage)
      } else {
        setSlippageType(SlippageType.Auto)
        setSlippageAmount(quoteSlippagePercentage ?? defaultSlippagePercentage)
      }
      // We only want this to run on mount, though not to be reactive to userSlippagePercentage
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultSlippagePercentage, quoteSlippagePercentage])

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      if (bnOrZero(value).gt(maxSlippagePercentage)) {
        setIsInvalid(true)
      } else {
        setIsInvalid(false)
      }
      setSlippageAmount(value)
      setSlippageType(SlippageType.Custom)
    }, [])

    const handleClose = useCallback(() => {
      if (slippageType === SlippageType.Custom && !isInvalid)
        dispatch(tradeInput.actions.setSlippagePreferencePercentage(slippageAmount))
      else if (slippageType === SlippageType.Auto)
        dispatch(tradeInput.actions.setSlippagePreferencePercentage(undefined))
    }, [dispatch, isInvalid, slippageAmount, slippageType])

    const handleSlippageTypeChange = useCallback(
      (type: SlippageType) => {
        if (type === SlippageType.Auto) {
          setSlippageAmount(defaultSlippagePercentage)
          setIsInvalid(false)
        } else {
          inputRef && inputRef.current && inputRef.current.focus()
          setSlippageAmount(slippageAmount)
        }
        setSlippageType(type)
      },
      [defaultSlippagePercentage, slippageAmount],
    )

    const handleAutoSlippageTypeChange = useCallback(
      () => handleSlippageTypeChange(SlippageType.Auto),
      [handleSlippageTypeChange],
    )

    const handleCustomSlippageTypeChange = useCallback(
      () => handleSlippageTypeChange(SlippageType.Custom),
      [handleSlippageTypeChange],
    )

    const isHighSlippage = useMemo(() => bnOrZero(slippageAmount).gt(1), [slippageAmount])
    const isLowSlippage = useMemo(() => bnOrZero(slippageAmount).lt(0.05), [slippageAmount])

    if (!isAdvancedSlippageEnabled) return null

    return (
      <Popover isLazy placement='bottom-end' onClose={handleClose}>
        <Tooltip isDisabled={!isDisabled} label={translate(tooltipTranslation)}>
          <Box display='inline-block'>
            <PopoverTrigger>
              <IconButton
                aria-label={translate('trade.tradeSettings')}
                icon={faGear}
                variant='ghost'
                isDisabled={isDisabled}
              />
            </PopoverTrigger>
          </Box>
        </Tooltip>
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
                    onClick={handleAutoSlippageTypeChange}
                    isActive={slippageType === SlippageType.Auto}
                  >
                    {translate('trade.slippage.auto')}
                  </Button>
                  <Button
                    onClick={handleCustomSlippageTypeChange}
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
                      value={slippageAmount}
                      type='number'
                      _focus={focusStyle}
                      onChange={handleChange}
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
  },
)
