import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Collapse,
  Icon,
  Radio,
  RadioGroup,
  useColorModeValue,
} from '@chakra-ui/react'
import type { ReactChild } from 'react'
import { Fragment } from 'react'
import type { Control } from 'react-hook-form'
import { useController } from 'react-hook-form'
import { IoIosArrowDown, IoIosArrowUp } from 'react-icons/io'
import { Text } from 'components/Text'
import { useToggle } from 'hooks/useToggle/useToggle'

export type Option = [string, string, ReactChild?]

export const FilterGroup = ({
  title,
  options,
  allowMultipleOptions = false,
  name,
  control,
  initialIsOpen = false,
}: {
  title: string
  options: Option[]
  allowMultipleOptions?: boolean
  name: string
  control: Control
  initialIsOpen?: boolean
}) => {
  const [isOpen, toggleIsOpen] = useToggle(initialIsOpen)

  const {
    field: { onChange, value },
  } = useController({ control, name })
  const GroupComponent = allowMultipleOptions ? CheckboxGroup : RadioGroup
  const InputComponent = allowMultipleOptions ? Checkbox : Radio
  return (
    <Box px={2}>
      <Button
        justifyContent='space-between'
        alignItems='center'
        variant='ghost'
        color={useColorModeValue('black', 'white')}
        _hover={{ bg: 'transparent' }}
        px={2}
        w='full'
        onClick={toggleIsOpen}
        rightIcon={
          isOpen ? (
            <Icon as={IoIosArrowUp} color='text.subtle' />
          ) : (
            <Icon as={IoIosArrowDown} color='text.subtle' />
          )
        }
      >
        <Text translation={title} />
      </Button>
      <Collapse in={isOpen} unmountOnExit>
        <Box px={2} mb={2}>
          <GroupComponent value={value ?? []} onChange={onChange} name={name}>
            {options.map(([title, optionValue, CustomComponent]: Option) => (
              <Fragment key={optionValue}>
                <Box py={1}>
                  <InputComponent value={optionValue}>
                    <Text translation={title} />
                  </InputComponent>
                </Box>
                {!!CustomComponent && CustomComponent}
              </Fragment>
            ))}
          </GroupComponent>
        </Box>
      </Collapse>
    </Box>
  )
}
