import { CheckIcon, CloseIcon, EditIcon } from '@chakra-ui/icons'
import {
  ButtonGroup,
  Editable,
  EditableInput,
  IconButton,
  Input,
  Stack,
  useEditableControls,
} from '@chakra-ui/react'
import { useController, useFormContext } from 'react-hook-form'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'

import type { BridgeState } from '../types'

const EditControls: React.FC<{ value: string }> = ({ value }) => {
  const { isEditing, getSubmitButtonProps, getCancelButtonProps, getEditButtonProps } =
    useEditableControls()
  return isEditing ? (
    <ButtonGroup size='sm'>
      <IconButton aria-label='Save' icon={<CheckIcon />} {...getSubmitButtonProps()} />
      <IconButton aria-label='Cancel' icon={<CloseIcon />} {...getCancelButtonProps()} />
    </ButtonGroup>
  ) : (
    <Stack direction='row'>
      <MiddleEllipsis value={value} />
      <IconButton
        size='sm'
        aria-label='Edit Address'
        icon={<EditIcon />}
        {...getEditButtonProps()}
      />
    </Stack>
  )
}

export const EditableAddress = () => {
  const { control } = useFormContext<BridgeState>()
  const { field } = useController({ name: 'receiveAddress', control })
  return (
    <Editable {...field}>
      <Input as={EditableInput} />
      <EditControls value={field.value ?? ''} />
    </Editable>
  )
}
