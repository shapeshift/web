import {
    Button,
    Flex,
    FormControl,
    FormLabel,
    Input,
    InputGroup,
    InputRightAddon,
    Select,
    Stack,
    Text,
    VStack,
} from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Card } from '@/components/Card/Card'
import { Text as RawText } from '@/components/Text'
import {
    stopLossInputActions,
    stopLossInputSelectors,
} from '@/state/slices/stopLossInputSlice/stopLossInputSlice'
import { StopLossTriggerType } from '@/state/slices/stopLossSlice/types'
import { useAppDispatch, useAppSelector } from '@/state/store'

export type StopLossInputProps = {
    isCompact?: boolean
}

export const StopLossInput = ({ isCompact }: StopLossInputProps) => {
    const translate = useTranslate()
    const dispatch = useAppDispatch()
    const navigate = useNavigate()

    const sellAmountCryptoPrecision = useAppSelector(
        stopLossInputSelectors.selectSellAmountCryptoPrecision,
    )
    const triggerType = useAppSelector(stopLossInputSelectors.selectTriggerType)
    const triggerValue = useAppSelector(stopLossInputSelectors.selectTriggerValue)

    const handleSubmit = useCallback(() => {
        navigate('confirm')
    }, [navigate])

    return (
        <Card flex={1} borderRadius='xl'>
            <VStack spacing={6} p={6} align='stretch'>
                <RawText translation='navBar.stopLoss.title' fontSize='xl' fontWeight='bold' />

                <FormControl>
                    <FormLabel>{translate('navBar.stopLoss.amount')}</FormLabel>
                    <InputGroup>
                        <Input
                            value={sellAmountCryptoPrecision}
                            onChange={e =>
                                dispatch(stopLossInputActions.setSellAmountCryptoPrecision(e.target.value))
                            }
                            placeholder='0.0'
                        />
                    </InputGroup>
                </FormControl>

                <FormControl>
                    <FormLabel>{translate('navBar.stopLoss.triggerType')}</FormLabel>
                    <Select
                        value={triggerType}
                        onChange={e =>
                            dispatch(stopLossInputActions.setTriggerType(e.target.value as StopLossTriggerType))
                        }
                    >
                        <option value='price'>{translate('navBar.stopLoss.price')}</option>
                        <option value='percentage'>{translate('navBar.stopLoss.percentage')}</option>
                    </Select>
                </FormControl>

                <FormControl>
                    <FormLabel>{translate('navBar.stopLoss.triggerValue')}</FormLabel>
                    <InputGroup>
                        <Input
                            value={triggerValue}
                            onChange={e => dispatch(stopLossInputActions.setTriggerValue(e.target.value))}
                            placeholder={triggerType === 'percentage' ? '10' : '0.0'}
                        />
                        {triggerType === 'percentage' && <InputRightAddon>%</InputRightAddon>}
                    </InputGroup>
                </FormControl>

                <Button colorScheme='blue' size='lg' onClick={handleSubmit} width='full'>
                    {translate('navBar.stopLoss.reviewOrder')}
                </Button>
            </VStack>
        </Card>
    )
}
