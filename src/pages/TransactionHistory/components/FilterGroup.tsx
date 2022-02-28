import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Collapse,
  Icon,
  useColorModeValue
} from '@chakra-ui/react'
import { useState } from 'react'
import { IoIosArrowDown, IoIosArrowUp } from 'react-icons/io'
import { Text } from 'components/Text'

export const FilterGroup = ({ title, options }: { title: string; options: string[] }) => {
  const [isOpen, setOpen] = useState(false)
  const toggleDayRange = () => setOpen(open => !open)
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
          <CheckboxGroup>
            {options.map(option => (
              <Box key={option} py={1}>
                <Checkbox>
                  <Text translation={option} fontWeight='300' />
                </Checkbox>
              </Box>
            ))}
          </CheckboxGroup>
        </Box>
      </Collapse>
    </Box>
  )
}
