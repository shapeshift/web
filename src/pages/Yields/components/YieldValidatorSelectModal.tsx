import {
    Avatar,
    Box,
    Button,
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
    VStack,
    useColorModeValue,
} from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { FaSearch } from 'react-icons/fa'

import { Amount } from '@/components/Amount/Amount'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS } from '@/lib/yieldxyz/constants'
import type { AugmentedYieldBalance, ValidatorDto } from '@/lib/yieldxyz/types'
import { YieldBalanceType } from '@/lib/yieldxyz/types'

type YieldValidatorSelectModalProps = {
    isOpen: boolean
    onClose: () => void
    validators: ValidatorDto[]
    onSelect: (address: string) => void
    balances?: AugmentedYieldBalance[]
}

export const YieldValidatorSelectModal = ({
    isOpen,
    onClose,
    validators,
    onSelect,
    balances,
}: YieldValidatorSelectModalProps) => {
    const [searchQuery, setSearchQuery] = useState('')
    const bgColor = useColorModeValue('white', 'gray.800')
    const borderColor = useColorModeValue('gray.100', 'gray.750')
    const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50')

    // Identify validators with active positions
    // Create a map for quick lookup of full validator details
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

            // Prefer the full validator DTO from the main list if available (has APY, voting power etc)
            // Otherwise fall back to the info on the balance object
            const fullValidator = validatorsMap.get(address)

            if (fullValidator) {
                uniqueValidators.set(address, fullValidator)
            } else {
                // Construct a partial DTO from the balance key
                uniqueValidators.set(address, {
                    ...balance.validator,
                    preferred: false,
                    votingPower: 0,
                    commission: 0,
                    status: 'active',
                    providerId: 'unknown',
                    rewardRate: undefined, // No APR known if not in list
                    tvl: '0',
                    tvlRaw: '0'
                } as ValidatorDto)
            }
        })

        const list = Array.from(uniqueValidators.values())

        // Filter by search query if present
        if (!searchQuery) return list

        const search = searchQuery.toLowerCase()
        return list.filter(v => v.name.toLowerCase().includes(search) || v.address.toLowerCase().includes(search))
    }, [balances, validatorsMap, searchQuery])

    const filteredValidators = useMemo(() => {
        return validators.filter(v => {
            const search = searchQuery.toLowerCase()
            return (
                v.name.toLowerCase().includes(search) || v.address.toLowerCase().includes(search)
            )
        })
    }, [validators, searchQuery])

    // Sort: Preferred -> Voting Power -> Name
    const allValidatorsSorted = useMemo(() => {
        return [...filteredValidators].sort((a, b) => {
            if (a.address === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS) return -1
            if (b.address === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS) return 1
            if (a.preferred && !b.preferred) return -1
            if (!a.preferred && b.preferred) return 1
            // Add voting power sort if available, else alpha
            return 0
        })
    }, [filteredValidators])

    const handleSelect = (address: string) => {
        onSelect(address)
        onClose()
    }

    const renderValidatorRow = (v: ValidatorDto) => {
        const apr = v.rewardRate?.total ? (v.rewardRate.total * 100).toFixed(2) + '%' : null

        // Calculate total USD for this validator
        const totalUsd = balances
            ?.filter(b => b.validator?.address === v.address)
            .reduce((acc, b) => acc.plus(bnOrZero(b.amountUsd)), bnOrZero(0))

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
                                <Box as='span' bg='blue.500' color='white' px={2} py={0.5} borderRadius='full' fontSize='xx-small' fontWeight='bold' textTransform='uppercase'>
                                    Preferred
                                </Box>
                            )}
                        </Flex>
                        {hasBalance && (
                            <Text fontSize='xs' color='text.subtle'>
                                <Amount.Fiat value={totalUsd.toFixed()} />
                            </Text>
                        )}
                    </Box>
                </Flex>
                <Box textAlign='right'>
                    {apr && (
                        <Text fontWeight='bold' color='green.400'>
                            {apr} APR
                        </Text>
                    )}
                </Box>
            </Flex>
        )
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} scrollBehavior='inside' size='lg'>
            <ModalOverlay backdropFilter='blur(5px)' />
            <ModalContent bg={bgColor} borderColor={borderColor}>
                <ModalHeader>Select Validator</ModalHeader>
                <ModalCloseButton />
                <ModalBody p={0}>
                    <Box px={6} mb={4}>
                        <InputGroup>
                            <InputLeftElement pointerEvents='none'>
                                <FaSearch color='gray.300' />
                            </InputLeftElement>
                            <Input
                                placeholder='Search for validator'
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </InputGroup>
                    </Box>

                    <Tabs isFitted variant='enclosed'>
                        <TabList px={6}>
                            <Tab>All Validators ({validators.length})</Tab>
                            <Tab>My Validators ({myValidators.length})</Tab>
                        </TabList>
                        <TabPanels>
                            {/* All Validators Tab */}
                            <TabPanel px={2}>
                                <VStack align='stretch' spacing={0}>
                                    {allValidatorsSorted.length > 0 ? (
                                        allValidatorsSorted.map(renderValidatorRow)
                                    ) : (
                                        <Text p={4} textAlign='center' color='gray.500'>
                                            No validators found
                                        </Text>
                                    )}
                                </VStack>
                            </TabPanel>

                            {/* My Validators Tab */}
                            <TabPanel px={2}>
                                <VStack align='stretch' spacing={0}>
                                    {myValidators.length > 0 ? (
                                        myValidators.map(renderValidatorRow)
                                    ) : (
                                        <Text p={4} textAlign='center' color='gray.500'>
                                            You don't have any active validators yet.
                                        </Text>
                                    )}
                                </VStack>
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                </ModalBody>
            </ModalContent>
        </Modal>
    )
}
