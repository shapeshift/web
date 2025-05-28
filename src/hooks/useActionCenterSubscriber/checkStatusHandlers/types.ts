import type { CreateToastFnReturn } from '@chakra-ui/react'
import type { Swap } from '@shapeshiftoss/swapper'

export type SwapCheckStatusHandlerProps = {
  toast: CreateToastFnReturn
  swap: Swap
  translate: any
}

export type CheckStatusHandler = ({ toast }: SwapCheckStatusHandlerProps) => Promise<boolean>
