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
import type { ChainId } from '@shapeshiftoss/caip'
import { useMemo, useRef, useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { IoOptionsOutline } from 'react-icons/io5'
import { useTranslate } from 'react-polyglot'
import { FilterGroup } from 'components/FilterGroup'
import { Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { isSome } from 'lib/utils'

export enum FilterFormFields {
  Network = 'network',
}

type NftNetworkFilterProps = {
  setFilters: Function
  resetFilters: Function
  hasAppliedFilter?: boolean
  availableChainIds: ChainId[]
}

export const NftNetworkFilter = ({
  setFilters,
  resetFilters,
  hasAppliedFilter = false,
  availableChainIds,
}: NftNetworkFilterProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef(null)

  const availableNetworkOptions = useMemo(() => {
    return availableChainIds
      .map(chainId => {
        const adapter = getChainAdapterManager().get(chainId)
        if (!adapter) return undefined
        return [adapter.getDisplayName(), chainId]
      })
      .filter(isSome)
  }, [availableChainIds]) as [string, ChainId][]

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
    const { network } = values
    let filterSet = {
      network,
    }
    setFilters(filterSet)
  }
  const popoverContentBg = useColorModeValue('gray.100', 'gray.700')
  const onResetFilters = () => {
    reset()
    resetFilters()
  }

  return (
    <Popover closeOnBlur={false} isOpen={isOpen} placement='bottom-start'>
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
                name={FilterFormFields.Network}
                control={control}
                title={translate('transactionRow.network')}
                allowMultipleOptions
                initialIsOpen
                options={availableNetworkOptions}
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
