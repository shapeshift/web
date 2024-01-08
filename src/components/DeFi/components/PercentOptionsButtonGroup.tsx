import { Button, ButtonGroup } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'

type MaxButtonProps = {
  isDisabled?: boolean
  onClick: (args: number) => void
  onMaxClick?: () => Promise<void>
  option: number
  value?: number | null
}

const percentFormatOptions = {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
}

export const PercentOptionsButton: React.FC<MaxButtonProps> = ({
  isDisabled,
  onClick,
  onMaxClick,
  option,
  value,
}) => {
  const translate = useTranslate()
  const handleClick = useCallback(async () => {
    onMaxClick && option === 1 ? await onMaxClick() : onClick(option)
  }, [onClick, onMaxClick, option])

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
  onClick: (args: number) => void
  onMaxClick?: () => Promise<void>
  options: number[]
  value?: number | null
}

export const PercentOptionsButtonGroup: React.FC<MaxButtonGroupProps> = ({
  isDisabled,
  onClick,
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
          onClick={onClick}
          onMaxClick={onMaxClick}
        />
      ))}
    </ButtonGroup>
  )
}
