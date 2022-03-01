import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Collapse,
  Icon,
  Radio,
  RadioGroup,
  useColorModeValue
} from '@chakra-ui/react'
import { useState } from 'react'
import { IoIosArrowDown, IoIosArrowUp } from 'react-icons/io'
import { Text } from 'components/Text'

type Option = [string, number | string]

export const FilterGroup = ({
  title,
  options,
  allowMultipleOptions = false,
  name,
  ...props
}: {
  title: string
  options: Option[]
  allowMultipleOptions?: boolean
  name: string
}) => {
  const [isOpen, setOpen] = useState(false)
  const toggleDayRange = () => setOpen(open => !open)
  const GroupComponent = allowMultipleOptions ? CheckboxGroup : RadioGroup
  const Component = allowMultipleOptions ? Checkbox : Radio
  return (
    <Box px={2}>
      <Button
        justifyContent='space-between'
        alignItems='center'
        variant='ghost'
        fontWeight='400'
        color={useColorModeValue('black', 'white')}
        _hover={{ bg: 'transparent' }}
        px={2}
        w='full'
        onClick={() => toggleDayRange()}
        rightIcon={
          isOpen ? (
            <Icon as={IoIosArrowUp} color='gray.500' />
          ) : (
            <Icon as={IoIosArrowDown} color='gray.500' />
          )
        }
      >
        <Text translation={title} />
      </Button>
      <Collapse in={isOpen} unmountOnExit>
        <Box px={2} mb={2}>
          <GroupComponent {...props}>
            {options.map(([title, value]) => (
              <Box key={value} py={1}>
                <Component name={name} value={value}>
                  <Text translation={title} fontWeight='300' />
                </Component>
              </Box>
            ))}
          </GroupComponent>
        </Box>
      </Collapse>
    </Box>
  )
}
