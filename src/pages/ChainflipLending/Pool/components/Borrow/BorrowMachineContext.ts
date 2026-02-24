import { createActorContext } from '@xstate/react'

import { borrowMachine } from './borrowMachine'

export const BorrowMachineCtx = createActorContext(borrowMachine)
