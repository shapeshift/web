global.console = {
    ...console,
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}