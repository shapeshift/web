import { vi } from 'vitest'

import { integration } from './integration'
import * as Phantom from './wallets/phantom'

vi.spyOn(console, 'error').mockImplementation(() => {})

integration(Phantom)
