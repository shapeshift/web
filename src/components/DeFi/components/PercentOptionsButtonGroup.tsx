import { Button, ButtonGroup } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'

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
  const translate = useTranslate()
  const handleClick = useCallback(
    async (option: number) => {
      onMaxClick && option === 1 ? await onMaxClick() : onClick(option)
    },
    [onClick, onMaxClick],
  )
  return (
    <ButtonGroup justifyContent='flex-end' size='xs'>
      {options.map(option => (
        <Button
          isDisabled={isDisabled}
          isActive={option === value}
          key={option}
          onClick={() => handleClick(option)}
        >
          {option === 1 ? (
            translate('modals.send.sendForm.max')
          ) : (
            <Amount.Percent
              value={option}
              options={{
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }}
            />
          )}
        </Button>
      ))}
    </ButtonGroup>
  )
}
