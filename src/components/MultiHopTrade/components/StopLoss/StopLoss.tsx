import { Flex } from '@chakra-ui/react'
import { useCallback } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'

import { SlideTransitionRoute } from '../SlideTransitionRoute'
import { StopLossConfirm } from './StopLossConfirm'
import { StopLossInput } from './StopLossInput'
import { StopLossList } from './StopLossList'

import { useAppDispatch, useAppSelector } from '@/state/store'

export type StopLossProps = {
    tradeInputRef: React.MutableRefObject<HTMLDivElement | null>
    isCompact?: boolean
}

export const StopLoss = ({ tradeInputRef, isCompact }: StopLossProps) => {
    const navigate = useNavigate()

    const renderStopLossInput = useCallback(() => {
        return (
            <StopLossInput
                isCompact={isCompact}
                tradeInputRef={tradeInputRef}
            />
        )
    }, [isCompact, tradeInputRef])

    const renderStopLossConfirm = useCallback(() => {
        return <StopLossConfirm />
    }, [])

    const inputSlideTransition = useCallback(
        () => (
            <SlideTransitionRoute
                height={tradeInputRef.current?.offsetHeight ?? '500px'}
                width={tradeInputRef.current?.offsetWidth ?? 'full'}
                component={StopLossList}
                parentRoute='/stop-loss'
            />
        ),
        [tradeInputRef],
    )

    return (
        <Flex flex={1} width='full' justifyContent='center'>
            <Routes>
                <Route
                    path='confirm'
                    element={renderStopLossConfirm()}
                />
                <Route
                    path='orders'
                    element={inputSlideTransition()}
                />
                <Route path='*' element={renderStopLossInput()} />
            </Routes>
        </Flex>
    )
}
