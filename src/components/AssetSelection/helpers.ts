import type { ButtonProps } from '@chakra-ui/react'

const disabledStyle = { cursor: 'not-allowed' }

export const getStyledMenuButtonProps = ({
  isDisabled,
  buttonProps,
  rightIcon,
}: {
  isDisabled?: boolean
  buttonProps?: ButtonProps
  rightIcon?: React.ReactElement
}) => {
  return Object.assign(
    {
      height: '40px',
      justifyContent: 'flex-end',
      pl: 2,
      pr: isDisabled ? 4 : 2,
      py: 2,
      gap: 2,
      size: 'sm',
      borderRadius: 'full',
      rightIcon,
      maxWidth: '50%',
      _disabled: disabledStyle,
    },
    buttonProps,
  )
}
