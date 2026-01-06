import { Box, Flex, HStack, Text } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { Amount } from '@/components/Amount/Amount'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type YieldAccountBreakdownProps = {
    balances: Record<string, any[]>
    yields: AugmentedYieldDto[]
    assetId: AssetId
}

export const YieldAccountBreakdown = ({ balances, yields, assetId }: YieldAccountBreakdownProps) => {
    const translate = useTranslate()
    const asset = useAppSelector(state => selectAssetById(state, assetId))

    if (!asset) return null

    // Flatten all balances to iterate over accounts
    const accountBalances: Record<string, { crypto: string; fiat: string }> = {}

    Object.entries(balances).forEach(([yieldId, acctBalances]) => {
        acctBalances.forEach(balance => {
            const address = balance.address
            if (!accountBalances[address]) {
                accountBalances[address] = { crypto: '0', fiat: '0' }
            }

            // Sum up balances for this account across yields
            accountBalances[address].crypto = bnOrZero(accountBalances[address].crypto).plus(balance.amount).toString()
            accountBalances[address].fiat = bnOrZero(accountBalances[address].fiat).plus(balance.amountUsd).toString()
        })
    })

    const accounts = Object.entries(accountBalances)

    if (accounts.length === 0) return null

    return (
        <Box>
            <Text fontSize='sm' color='gray.500' fontWeight='medium' mb={2}>
                {translate('defi.yourBalance')}
            </Text>
            <Box
                bg='whiteAlpha.50'
                borderRadius='xl'
                borderWidth='1px'
                borderColor='whiteAlpha.100'
                overflow='hidden'
            >
                {accounts.map(([address, balance], idx) => (
                    <Flex
                        key={address}
                        justify='space-between'
                        align='center'
                        p={4}
                        borderBottomWidth={idx !== accounts.length - 1 ? '1px' : '0'}
                        borderColor='whiteAlpha.100'
                    >
                        <HStack>
                            <Box
                                w={2}
                                h={2}
                                borderRadius='full'
                                bg='green.400'
                                boxShadow='0 0 8px rgba(72, 187, 120, 0.4)'
                            />
                            <MiddleEllipsis value={address} color='gray.300' fontSize='sm' fontWeight='bold' />
                        </HStack>
                        <Box textAlign='right'>
                            <Amount.Fiat value={balance.fiat} fontWeight='bold' color='white' />
                            <Amount.Crypto value={balance.crypto} symbol={asset.symbol} color='gray.500' fontSize='sm' />
                        </Box>
                    </Flex>
                ))}
            </Box>
        </Box>
    )
}
