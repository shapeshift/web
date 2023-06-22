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
  useColorModeValue,
} from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { debounce } from 'lodash'
import { useCallback, useMemo, useRef, useState } from 'react'
import { FaSlidersH } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

enum SlippageType {
  Auto = 'Auto',
  Custom = 'Custom',
}

const defaultSlippagePercentage = '0.10'
const maxSlippagePercentage = '30'

export const SlippagePopover = () => {
  const [slippageType, setSlippageType] = useState<SlippageType>(SlippageType.Auto)
  const [slippageAmount, setSlippageAmount] = useState(defaultSlippagePercentage)
  const [value, setValue] = useState('')
  const [isInvalid, setIsInvalid] = useState(false)
  const translate = useTranslate()
  const inputRef = useRef<HTMLInputElement>(null)
  const isAdvancedSlippageEnabled = useFeatureFlag('AdvancedSlippage')
  const buttonGroupBg = useColorModeValue('blackAlpha.50', 'gray.850')

  const handleDebounce = useCallback(
    (value: string) => {
      setSlippageAmount(value)
    },
    [setSlippageAmount],
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
      setValue(value)
      setSlippageType(SlippageType.Custom)
    },
    [debounceFnc],
  )

  const handleSlippageTypeChange = useCallback((type: SlippageType) => {
    if (type === SlippageType.Auto) {
      setValue('')
      setSlippageAmount(defaultSlippagePercentage)
      setIsInvalid(false)
    } else {
      inputRef && inputRef.current && inputRef.current.focus()
    }
    setSlippageType(type)
  }, [])

  const handleOnBlur = useCallback(() => {
    if (isInvalid) setValue(slippageAmount)
  }, [isInvalid, slippageAmount])

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
            <Row.Value>
              {slippageType === SlippageType.Custom ? `${slippageAmount}%` : 'Auto'}
            </Row.Value>
          </Row>
          <Row py={2} gap={2} mt={2}>
            <Row.Value>
              <ButtonGroup
                size='sm'
                bg={buttonGroupBg}
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
                    value={value}
                    onBlur={handleOnBlur}
                    type='number'
                    _focus={{ '&[aria-invalid=true]': { borderColor: 'red.500' } }}
                    onChange={e => handleChange(e.target.value)}
                    ref={inputRef}
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
