import { LogLevel } from '@shapeshiftoss/logger'
import * as guarded from 'config/guarded'

const validators = {
  REACT_APP_LOG_LEVEL: guarded.str<LogLevel>({
    choices: Object.values(LogLevel),
    default: LogLevel.DEBUG,
  }),
}

// eslint-disable-next-line import/no-default-export
export default validators
