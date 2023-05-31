import { CloseIcon } from '@chakra-ui/icons'
import {
  Button,
  ButtonGroup,
  Divider,
  Flex,
  IconButton,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  useColorModeValue,
  useOutsideClick,
} from '@chakra-ui/react'
import { ethChainId, gnosisChainId, optimismChainId, polygonChainId } from '@shapeshiftoss/caip'
import { useRef, useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { IoOptionsOutline } from 'react-icons/io5'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { FilterGroup } from 'pages/TransactionHistory/components/FilterGroup'

export enum FilterFormFields {
  Chains = 'chains',
}

type TransactionHistoryFilterProps = {
  setFilters: Function
  resetFilters: Function
  hasAppliedFilter?: boolean
}

export const NftChainFilter = ({
  setFilters,
  resetFilters,
  hasAppliedFilter = false,
}: TransactionHistoryFilterProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef(null)
  /**
   * Popover default outside click detector didn't play well with
   * react-datepicker, but making it controlled and
   * passing a new detector to popover content,
   * solved the problem.
   */
  useOutsideClick({
    ref: popoverRef,
    handler: () => {
      setIsOpen(false)
    },
  })
  const translate = useTranslate()
  const { control, handleSubmit, reset } = useForm({ mode: 'onChange' })
  const onSubmit = (values: FieldValues) => {
    const { chains } = values
    let filterSet = {
      chains,
    }
    setFilters(filterSet)
  }
  const popoverContentBg = useColorModeValue('gray.100', 'gray.700')
  const onResetFilters = () => {
    reset()
    resetFilters()
  }

  return (
    <Popover closeOnBlur={false} isOpen={isOpen}>
      <>
        <PopoverTrigger>
          <ButtonGroup isAttached variant='ghost-filled'>
            <Button
              colorScheme='blue'
              variant='ghost-filled'
              leftIcon={<IoOptionsOutline size='1.5em' />}
              onClick={() => setIsOpen(state => !state)}
            >
              <Text translation='transactionHistory.filter' />
            </Button>
            <IconButton
              variant='ghost-filled'
              colorScheme='blue'
              aria-label={translate('transactionHistory.filters.resetFilters')}
              icon={<CloseIcon w={3} h={3} />}
              onClick={e => {
                e.stopPropagation()
                onResetFilters()
              }}
            />
          </ButtonGroup>
        </PopoverTrigger>
        <PopoverContent
          w='360px'
          maxWidth='100%'
          bg={popoverContentBg}
          boxShadow='lg'
          ref={popoverRef}
        >
          <PopoverBody p={0}>
            <Flex p={2} justifyContent='space-between' alignItems='center'>
              <Text px={2} translation='transactionHistory.filter' />
              <Button
                variant='ghost'
                p={2}
                isDisabled={!hasAppliedFilter}
                colorScheme='blue'
                _hover={{ bg: 'transparent' }}
                onClick={() => onResetFilters()}
              >
                <Text translation='transactionHistory.filters.resetFilters' />
              </Button>
            </Flex>
            <Divider />
            <form onSubmit={handleSubmit(onSubmit)}>
              <FilterGroup
                name={FilterFormFields.Chains}
                control={control}
                title='Chains'
                allowMultipleOptions
                initialIsOpen
                options={[
                  ['Ethereum', ethChainId],
                  ['Gnosis', gnosisChainId],
                  ['Polygon', polygonChainId],
                  ['Optimism', optimismChainId],
                ]}
              />
              <Flex justifyContent='center' alignItems='center'>
                <Button colorScheme='blue' my={4} type='submit' onClick={() => setIsOpen(false)}>
                  <Text translation='transactionHistory.filters.apply' />
                </Button>
              </Flex>
            </form>
          </PopoverBody>
        </PopoverContent>
      </>
    </Popover>
  )
}
