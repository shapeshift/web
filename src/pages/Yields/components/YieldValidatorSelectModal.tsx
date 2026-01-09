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
import { searchValidators, sortValidators, toUserCurrency } from '@/lib/yieldxyz/utils'
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

    const balanceMap = useMemo(() => {
      if (!balances) return new Map<string, string>()
      const map = new Map<string, string>()
      for (const balance of balances) {
        if (!balance.validator || bnOrZero(balance.amount).lte(0)) continue
        const addr = balance.validator.address
        map.set(
          addr,
          bnOrZero(map.get(addr) || '0')
            .plus(balance.amountUsd)
            .toFixed(),
        )
      }
      return map
    }, [balances])

    const myValidators = useMemo(() => {
      if (!balances) return []
      const seen = new Set<string>()
      const result: ValidatorDto[] = []
      for (const balance of balances) {
        if (
          !balance.validator ||
          bnOrZero(balance.amount).lte(0) ||
          seen.has(balance.validator.address)
        )
          continue
        seen.add(balance.validator.address)
        const full = validators.find(v => v.address === balance.validator?.address)
        result.push(
          full ?? {
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
          },
        )
      }
      return result
    }, [balances, validators])

    const allValidators = validators

    const filteredAll = useMemo(
      () => sortValidators(searchValidators(allValidators, searchQuery)),
      [allValidators, searchQuery],
    )

    const filteredMy = useMemo(
      () => searchValidators(myValidators, searchQuery),
      [myValidators, searchQuery],
    )

    const handleSelect = useCallback(
      (address: string) => {
        onSelect(address)
        onClose()
      },
      [onSelect, onClose],
    )

    const handleSearchChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value),
      [],
    )

    const renderValidatorRow = useCallback(
      (v: ValidatorDto) => {
        const apr = v.rewardRate?.total ? `${(v.rewardRate.total * 100).toFixed(2)}%` : null
        const usd = balanceMap.get(v.address) || '0'
        const hasBalance = bnOrZero(usd).gt(0)

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
                    <Amount.Fiat value={toUserCurrency(usd, userCurrencyToUsdRate)} />
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
      [balanceMap, userCurrencyToUsdRate, hoverBg, handleSelect, translate],
    )

    return (
      <Modal isOpen={isOpen} onClose={onClose} scrollBehavior='inside' size='lg'>
        <ModalOverlay backdropFilter='blur(5px)' />
        <ModalContent bg={bgColor} borderColor={borderColor}>
          <ModalHeader>{translate('yieldXYZ.selectValidator')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody p={0}>
            <Box px={6} mb={4}>
              <InputGroup>
                <InputLeftElement pointerEvents='none'>{searchIcon}</InputLeftElement>
                <Input
                  placeholder={translate('yieldXYZ.searchValidator')}
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </InputGroup>
            </Box>
            <Tabs isFitted variant='enclosed'>
              <TabList px={6}>
                <Tab>{`${translate('yieldXYZ.allValidators')} (${filteredAll.length})`}</Tab>
                <Tab>{`${translate('yieldXYZ.myValidators')} (${filteredMy.length})`}</Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={2}>
                  <VStack align='stretch' spacing={0}>
                    {filteredAll.length === 0 ? (
                      <Text p={4} textAlign='center' color='gray.500'>
                        {translate('yieldXYZ.noValidatorsFound')}
                      </Text>
                    ) : (
                      filteredAll.map(renderValidatorRow)
                    )}
                  </VStack>
                </TabPanel>
                <TabPanel px={2}>
                  <VStack align='stretch' spacing={0}>
                    {filteredMy.length === 0 ? (
                      <Text p={4} textAlign='center' color='gray.500'>
                        {translate('yieldXYZ.noActiveValidators')}
                      </Text>
                    ) : (
                      filteredMy.map(renderValidatorRow)
                    )}
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
