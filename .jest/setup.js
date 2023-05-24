global.console = {
    ...console,
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}

process.env.REACT_APP_FEATURE_NFT_METADATA=true