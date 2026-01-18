import { Box, VStack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { Card } from '@/components/Card/Card'
import { Text } from '@/components/Text'
import { selectAllOrders } from '@/state/slices/stopLossSlice/selectors'
import { useAppSelector } from '@/state/store'

export const StopLossList = () => {
    const translate = useTranslate()
    const orders = useAppSelector(selectAllOrders)

    if (orders.length === 0) {
        return (
            <Card flex={1} borderRadius='xl' p={6}>
                <Text translation='stopLoss.noOrders' textAlign='center' color='gray.500' />
            </Card>
        )
    }

    return (
        <Card flex={1} borderRadius='xl' p={4}>
            <VStack spacing={4} align='stretch'>
                <Text translation='stopLoss.activeOrders' fontWeight='bold' />
                {orders.map(order => (
                    <Box
                        key={order.id}
                        p={4}
                        borderWidth={1}
                        borderRadius='md'
                        borderColor='gray.700'
                    >
                        <Text
                            translation={[
                                'stopLoss.orderSummary',
                                {
                                    status: order.status,
                                    amount: order.params.sellAmountCryptoBaseUnit,
                                    trigger: `${order.params.triggerValue} ${order.params.triggerType}`,
                                },
                            ]}
                        />
                    </Box>
                ))}
            </VStack>
        </Card>
    )
}
