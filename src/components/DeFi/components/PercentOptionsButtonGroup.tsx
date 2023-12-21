import { Button, ButtonGroup } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'

type MaxButtonProps = {
  isDisabled?: boolean
  onPercentOptionClick?: (args: number) => void
  onMaxClick?: () => void
  option: number
  value?: number | null
}

const percentFormatOptions = {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
}

export const PercentOptionsButton: React.FC<MaxButtonProps> = ({
  isDisabled,
  onPercentOptionClick,
  onMaxClick,
  option,
  value,
}) => {
  const translate = useTranslate()
  const handleClick = useCallback(() => {
    if (onMaxClick && option === 1) {
      onMaxClick()
    } else if (onPercentOptionClick) {
      onPercentOptionClick(option)
    }
  }, [onPercentOptionClick, onMaxClick, option])

  return (
    <Button isDisabled={isDisabled} isActive={option === value} key={option} onClick={handleClick}>
      {option === 1 ? (
        translate('modals.send.sendForm.max')
      ) : (
        <Amount.Percent value={option} options={percentFormatOptions} />
      )}
    </Button>
  )
}

type MaxButtonGroupProps = {
  isDisabled?: boolean
  onPercentOptionClick?: (args: number) => void
  onMaxClick?: () => void
  options: number[]
  value?: number | null
}

export const PercentOptionsButtonGroup: React.FC<MaxButtonGroupProps> = ({
  isDisabled,
  onPercentOptionClick,
  onMaxClick,
  options,
  value,
}) => {
  return (
    <ButtonGroup justifyContent='flex-end' size='xs'>
      {options.map(option => (
        <PercentOptionsButton
          isDisabled={isDisabled}
          value={value}
          option={option}
          key={option}
          onPercentOptionClick={onPercentOptionClick}
          onMaxClick={onMaxClick}
        />
      ))}
    </ButtonGroup>
  )
}
