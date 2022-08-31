import { Button, ButtonGroup } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'

type MaxButtonGroupProps = {
  options: number[]
  value?: number | null
  onClick: (args: number) => void
  isDisabled?: boolean
}

export const MaxButtonGroup: React.FC<MaxButtonGroupProps> = ({
  options,
  value,
  onClick,
  isDisabled,
}) => {
  return (
    <ButtonGroup justifyContent='flex-end' size='xs'>
      {options.map(option => (
        <Button
          isDisabled={isDisabled}
          isActive={option === value}
          key={option}
          onClick={() => onClick(option)}
        >
          {option === 1 ? (
            'Max'
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
