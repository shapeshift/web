# lib

## Getting started

```bash
# Install the required dependencies
yarn
```

## Testing

Bug fixes and features should always come with tests, when applicable. Test files should live next to the file they are testing. Before submitting your changes in a pull request, always run the full test suite.

To run the test suite:

```bash
# Runs the full test suite
yarn test

# Runs the full w/ the watch flag and coverage reports
yarn test:dev
```

**Helpful Testing Process**

One technique that can helpful when writing tests, is to reference the coverage report for the file/function/feature you're testing. To do this, run `yarn test:dev` from your terminal. This will generate a coverage report for the project in the `coverage` directory. To view the report, open the file `coverage/lcov-report/index.html`. 

## Contributing

Please see the [Contributing Guidlines](CONTRIBUTING.md) document for this repo's specific contributing guidelines.
