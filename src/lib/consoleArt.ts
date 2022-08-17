import { logger } from 'lib/logger'
const moduleLogger = logger.child({ namespace: ['consoleArt'] })
export const renderConsoleArt = () => {
  moduleLogger.info(
    'color: #3761F9; font-size: 16px; font-family: monospace',
    `%c 🦊 ShapeShift DAO`,
  )
  moduleLogger.info(
    'color: #3761F9; font-size: 12px; font-family: monospace',
    `%c 💬 Join our Discord https://discord.gg/shapeshift`,
  )
  moduleLogger.info(
    'color: #3761F9; font-size: 12px; font-family: monospace',
    `%c 📝 See the DAO overview https://app.boardroom.info/shapeshift/overview`,
  )
  moduleLogger.info(
    'color: #3761F9; font-size: 12px; font-family: monospace',
    `%c 🧑‍💻 Contribute on GitHub https://github.com/shapeshift`,
  )
  moduleLogger.info(
    'color: #3761F9; font-size: 12px; font-family: monospace',
    `%c
    lcdOXWMMMMMMMMMMMMMMMMMMMMMMMMMMMMNKOdcd
    :  .';lx0NWMMMMMMMMMMMMMMMMMMNKOdc,'.  l
    o..dxl;'.':oxOOOOOOOOOOOOOkdc,..,:oko..k
    O..xWMWXOo. ..''''''''''''. .ckKNWMNo.,K
    X: cNMMMKl..o0XXXXXXXXXXXKx,.;kNMMMX; lN
    Wo ,KMNk,.:0WMMMMMMMMMMMMMMXd..c0WMO..kM
    MO..xKc..dNMMMMMMMMMMMMMMMMMW0c..dKo ,KM
    MX; .'.:0WMMMMMMMMMMMMMMMMMMMMNk,... lNM
    MWo   .:llllllllllllllllllllllll:.  .xWM
    MNl    .;::::::::::::::::::::::,.   .xWM
    MO..::..cONMMMMMMMMMMMMMMMMMWXx;.'l; ;KM
    X: :XW0l'.;kNMMMMMMMMMMMMMWKd'.,dXWO'.dW
    x..kWMMWKd,.,dKWMMMMMMMMW0l..:kNMMMNl ,K
    : .;ldk0XNXk;..l0WMMMMNk:..cONNK0xoc' .x
    Kd:.   ..,:ll:. .:k00x,..,coc;'.    'ckX
    MMWKxc.   .,,'..   ..   ..',,.  .'lkXWMM
    MMMMMWXkl'.'lkOko'    ;dOOxc'.,oONMMMMMM
    MMMMMMMMMXk:..cdc.    .ld:..cONMMMMMMMMM
    MMMMMMMMMMMW0l.          'oKWMMMMMMMMMMM
    MMMMMMMMMMMMMWKl.      .oXMMMMMMMMMMMMMM
    MMMMMMMMMMMMMMMW0c.  .lKWMMMMMMMMMMMMMMM
    MMMMMMMMMMMMMMMMMNo,;dNMMMMMMMMMMMMMMMMM
    `,
  )
}
