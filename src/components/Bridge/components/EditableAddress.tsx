import { CheckIcon, CloseIcon, EditIcon } from '@chakra-ui/icons'
import {
  ButtonGroup,
  Editable,
  EditableInput,
  EditablePreview,
  IconButton,
  Input,
  useEditableControls,
} from '@chakra-ui/react'
import { useController, useFormContext } from 'react-hook-form'

import { BridgeState } from '../types'

const EditControls = () => {
  const { isEditing, getSubmitButtonProps, getCancelButtonProps, getEditButtonProps } =
    useEditableControls()
  return isEditing ? (
    <ButtonGroup size='sm'>
      <IconButton aria-label='Save' icon={<CheckIcon />} {...getSubmitButtonProps()} />
      <IconButton aria-label='Cancel' icon={<CloseIcon />} {...getCancelButtonProps()} />
    </ButtonGroup>
  ) : (
    <IconButton size='sm' aria-label='Edit Address' icon={<EditIcon />} {...getEditButtonProps()} />
  )
}

export const EditableAddress = () => {
  const { control } = useFormContext<BridgeState>()
  const { field } = useController({ name: 'address', control })
  return (
    <Editable {...field}>
      {field.value}
      <Input as={EditableInput} />
      <EditControls />
    </Editable>
  )
}
