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
import { useCallback, useMemo, useRef, useState } from 'react'
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

const hoverProp = { bg: 'transparent' }

const ioOptionsOutlineIcon = <IoOptionsOutline size='1.5em' />
const closeIcon = <CloseIcon w={3} h={3} />

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
  const onSubmit = useCallback(
    (values: FieldValues) => {
      const { network } = values
      let filterSet = {
        network,
      }
      setFilters(filterSet)
    },
    [setFilters],
  )
  const popoverContentBg = useColorModeValue('gray.100', 'gray.700')
  const onResetFilters = useCallback(() => {
    reset()
    resetFilters()
  }, [reset, resetFilters])

  const handleFormSubmit = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit])

  const handleResetFilters = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      e.stopPropagation()
      onResetFilters()
    },
    [onResetFilters],
  )

  const toggleIsOpen = useCallback(() => setIsOpen(state => !state), [])
  const handleClose = useCallback(() => setIsOpen(false), [])

  return (
    <Popover isLazy closeOnBlur={false} isOpen={isOpen} placement='bottom-start'>
      <>
        <PopoverTrigger>
          <ButtonGroup isAttached variant='ghost-filled'>
            <Button
              colorScheme='blue'
              variant='ghost-filled'
              leftIcon={ioOptionsOutlineIcon}
              onClick={toggleIsOpen}
            >
              <Text translation='transactionHistory.filter' />
            </Button>
            <IconButton
              variant='ghost-filled'
              colorScheme='blue'
              aria-label={translate('transactionHistory.filters.resetFilters')}
              icon={closeIcon}
              onClick={handleResetFilters}
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
                _hover={hoverProp}
                onClick={onResetFilters}
              >
                <Text translation='transactionHistory.filters.resetFilters' />
              </Button>
            </Flex>
            <Divider />
            <form onSubmit={handleFormSubmit}>
              <FilterGroup
                name={FilterFormFields.Network}
                control={control}
                title={translate('transactionRow.network')}
                allowMultipleOptions
                initialIsOpen
                options={availableNetworkOptions}
              />
              <Flex justifyContent='center' alignItems='center'>
                <Button colorScheme='blue' my={4} type='submit' onClick={handleClose}>
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
