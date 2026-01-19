import { Button, VStack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Card } from '@/components/Card/Card'
import { Text } from '@/components/Text'
import { stopLossSlice } from '@/state/slices/stopLossSlice/stopLossSlice'
import {
    stopLossInputActions,
    stopLossInputSelectors,
} from '@/state/slices/stopLossInputSlice/stopLossInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'

export const StopLossConfirm = () => {
    const translate = useTranslate()
    const dispatch = useAppDispatch()
    const navigate = useNavigate()

    const sellAssetId = useAppSelector(stopLossInputSelectors.selectSellAssetId)
    const sellAsset = useAppSelector(state => selectAssetById(state, sellAssetId ?? ''))
    const sellAmountCryptoPrecision = useAppSelector(
        stopLossInputSelectors.selectSellAmountCryptoPrecision,
    )
    const buyAssetId = useAppSelector(stopLossInputSelectors.selectBuyAssetId)
    const triggerType = useAppSelector(stopLossInputSelectors.selectTriggerType)
    const triggerValue = useAppSelector(stopLossInputSelectors.selectTriggerValue)
    const currentPrice = useAppSelector(stopLossInputSelectors.selectCurrentPrice)
    const sellAccountId = useAppSelector(stopLossInputSelectors.selectSellAccountId)

    const handleConfirm = useCallback(() => {
        if (!sellAssetId || !buyAssetId || !sellAccountId) return

        const sellAmountCryptoBaseUnit = bnOrZero(sellAmountCryptoPrecision)
            .times(bnOrZero(10).pow(sellAsset?.precision ?? 18))
            .toFixed(0)

        dispatch(
            stopLossSlice.actions.createOrder({
                sellAssetId,
                buyAssetId,
                sellAmountCryptoBaseUnit,
                triggerType,
                triggerValue,
                entryPrice: currentPrice,
                accountId: sellAccountId,
                validTo: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days default
            }),
        )

        dispatch(stopLossInputActions.reset())
        navigate('../orders')
    }, [
        dispatch,
        navigate,
        sellAssetId,
        buyAssetId,
        sellAccountId,
        sellAmountCryptoPrecision,
        triggerType,
        triggerValue,
        currentPrice,
    ])

    return (
        <Card flex={1} borderRadius='xl'>
            <VStack spacing={6} p={6} align='stretch'>
                <Text translation='navBar.stopLoss.confirmTitle' fontSize='xl' fontWeight='bold' />

                <VStack align='start' spacing={2}>
                    <Text translation='navBar.stopLoss.confirmAmount' />
                    <Text translation={['navBar.stopLoss.value', { value: sellAmountCryptoPrecision }]} />

                    <Text translation='navBar.stopLoss.confirmTrigger' />
                    <Text
                        translation={[
                            'navBar.stopLoss.triggerDetails',
                            { type: triggerType, value: triggerValue },
                        ]}
                    />
                </VStack>

                <Button colorScheme='blue' size='lg' onClick={handleConfirm} width='full'>
                    {translate('navBar.stopLoss.confirmOrder')}
                </Button>
            </VStack>
        </Card>
    )
}
