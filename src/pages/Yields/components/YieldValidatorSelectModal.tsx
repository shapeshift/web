import {
  Avatar,
  Box,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import type { ChangeEvent } from 'react'
import { memo, useCallback, useMemo, useState } from 'react'
import { FaSearch } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS } from '@/lib/yieldxyz/constants'
import type { ValidatorDto } from '@/lib/yieldxyz/types'
import { GradientApy } from '@/pages/Yields/components/GradientApy'
import type { AugmentedYieldBalanceWithAccountId } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { selectUserCurrencyToUsdRate } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const searchIcon = <FaSearch color='gray.300' />

type YieldValidatorSelectModalProps = {
  isOpen: boolean
  onClose: () => void
  validators: ValidatorDto[]
  onSelect: (address: string) => void
  balances?: AugmentedYieldBalanceWithAccountId[]
}

export const YieldValidatorSelectModal = memo(
  ({ isOpen, onClose, validators, onSelect, balances }: YieldValidatorSelectModalProps) => {
    const translate = useTranslate()
    const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)
    const [searchQuery, setSearchQuery] = useState('')
    const bgColor = useColorModeValue('white', 'gray.800')
    const borderColor = useColorModeValue('gray.100', 'gray.750')
    const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50')

    const validatorsMap = useMemo(() => {
      return new Map(validators.map(v => [v.address, v]))
    }, [validators])

    const myValidators = useMemo(() => {
      if (!balances) return []

      const uniqueValidators = new Map<string, ValidatorDto>()

      balances.forEach(balance => {
        if (!balance.validator || !bnOrZero(balance.amount).gt(0)) return

        const address = balance.validator.address
        if (uniqueValidators.has(address)) return

        const fullValidator = validatorsMap.get(address)

        if (fullValidator) {
          uniqueValidators.set(address, fullValidator)
        } else {
          const partialValidator: ValidatorDto = {
            address: balance.validator.address,
            name: balance.validator.name,
            logoURI: balance.validator.logoURI,
            preferred: false,
            votingPower: 0,
            commission: balance.validator.commission ?? 0,
            status: balance.validator.status ?? 'active',
            tvl: '0',
            tvlRaw: '0',
            rewardRate: {
              total: balance.validator.apr ?? 0,
              rateType: 'APR' as const,
              components: [],
            },
          }
          uniqueValidators.set(address, partialValidator)
        }
      })

      const list = Array.from(uniqueValidators.values())

      if (!searchQuery) return list

      const search = searchQuery.toLowerCase()
      return list.filter(
        v =>
          (v.name || '').toLowerCase().includes(search) ||
          (v.address || '').toLowerCase().includes(search),
      )
    }, [balances, validatorsMap, searchQuery])

    const filteredValidators = useMemo(() => {
      return validators.filter(v => {
        const search = searchQuery.toLowerCase()
        return (
          (v.name || '').toLowerCase().includes(search) ||
          (v.address || '').toLowerCase().includes(search)
        )
      })
    }, [validators, searchQuery])

    const allValidatorsSorted = useMemo(() => {
      return [...filteredValidators].sort((a, b) => {
        if (a.address === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS) return -1
        if (b.address === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS) return 1
        if (a.preferred && !b.preferred) return -1
        if (!a.preferred && b.preferred) return 1
        return 0
      })
    }, [filteredValidators])

    const handleSelect = useCallback(
      (address: string) => {
        onSelect(address)
        onClose()
      },
      [onSelect, onClose],
    )

    const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value)
    }, [])

    const renderValidatorRow = useCallback(
      (v: ValidatorDto) => {
        const apr = v.rewardRate?.total ? (v.rewardRate.total * 100).toFixed(2) + '%' : null

        const totalUsd = (balances || [])
          .filter(b => b.validator?.address === v.address)
          .reduce((acc, b) => acc.plus(bnOrZero(b.amountUsd)), bnOrZero(0))
        const totalUserCurrency = totalUsd.times(userCurrencyToUsdRate).toFixed()

        const hasBalance = totalUsd?.gt(0)

        return (
          <Flex
            key={v.address}
            align='center'
            justify='space-between'
            p={4}
            cursor='pointer'
            borderRadius='lg'
            _hover={{ bg: hoverBg }}
            onClick={() => handleSelect(v.address)}
          >
            <Flex align='center' gap={3}>
              <Avatar src={v.logoURI} name={v.name} boxSize='40px' />
              <Box>
                <Flex align='center' gap={2}>
                  <Text fontWeight='bold'>{v.name}</Text>
                  {v.address === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS && (
                    <Box
                      as='span'
                      bg='blue.500'
                      color='white'
                      px={2}
                      py={0.5}
                      borderRadius='full'
                      fontSize='xx-small'
                      fontWeight='bold'
                      textTransform='uppercase'
                    >
                      {translate('yieldXYZ.preferred')}
                    </Box>
                  )}
                </Flex>
                {hasBalance && (
                  <Text fontSize='xs' color='text.subtle'>
                    <Amount.Fiat value={totalUserCurrency} />
                  </Text>
                )}
              </Box>
            </Flex>
            <Box textAlign='right'>
              {apr && (
                <GradientApy fontWeight='bold'>
                  {apr} {translate('yieldXYZ.apr')}
                </GradientApy>
              )}
            </Box>
          </Flex>
        )
      },
      [balances, userCurrencyToUsdRate, hoverBg, handleSelect, translate],
    )

    const searchPlaceholder = useMemo(() => translate('yieldXYZ.searchValidator'), [translate])

    const allValidatorsTabLabel = useMemo(
      () => `${translate('yieldXYZ.allValidators')} (${validators.length})`,
      [translate, validators.length],
    )

    const myValidatorsTabLabel = useMemo(
      () => `${translate('yieldXYZ.myValidators')} (${myValidators.length})`,
      [translate, myValidators.length],
    )

    const noValidatorsFoundText = useMemo(
      () => translate('yieldXYZ.noValidatorsFound'),
      [translate],
    )

    const noActiveValidatorsText = useMemo(
      () => translate('yieldXYZ.noActiveValidators'),
      [translate],
    )

    const allValidatorsContent = useMemo(() => {
      if (allValidatorsSorted.length === 0) {
        return (
          <Text p={4} textAlign='center' color='gray.500'>
            {noValidatorsFoundText}
          </Text>
        )
      }
      return allValidatorsSorted.map(renderValidatorRow)
    }, [allValidatorsSorted, renderValidatorRow, noValidatorsFoundText])

    const myValidatorsContent = useMemo(() => {
      if (myValidators.length === 0) {
        return (
          <Text p={4} textAlign='center' color='gray.500'>
            {noActiveValidatorsText}
          </Text>
        )
      }
      return myValidators.map(renderValidatorRow)
    }, [myValidators, renderValidatorRow, noActiveValidatorsText])

    const modalHeader = useMemo(() => translate('yieldXYZ.selectValidator'), [translate])

    return (
      <Modal isOpen={isOpen} onClose={onClose} scrollBehavior='inside' size='lg'>
        <ModalOverlay backdropFilter='blur(5px)' />
        <ModalContent bg={bgColor} borderColor={borderColor}>
          <ModalHeader>{modalHeader}</ModalHeader>
          <ModalCloseButton />
          <ModalBody p={0}>
            <Box px={6} mb={4}>
              <InputGroup>
                <InputLeftElement pointerEvents='none'>{searchIcon}</InputLeftElement>
                <Input
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </InputGroup>
            </Box>
            <Tabs isFitted variant='enclosed'>
              <TabList px={6}>
                <Tab>{allValidatorsTabLabel}</Tab>
                <Tab>{myValidatorsTabLabel}</Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={2}>
                  <VStack align='stretch' spacing={0}>
                    {allValidatorsContent}
                  </VStack>
                </TabPanel>
                <TabPanel px={2}>
                  <VStack align='stretch' spacing={0}>
                    {myValidatorsContent}
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    )
  },
)
