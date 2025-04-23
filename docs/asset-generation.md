# Asset data generation

Our asset data is generated periodically using a yarn script, with the result committed to source control.

### Before you start

The script requires private Zerion and CoinCap API keys. Request the keys from the engineering team and set it as an environment variable:

```bash
export ZERION_API_KEY=<zerion api key>
export COINCAP_API_KEY=<coincap api key>
```

### Running the script

Run the script:

```bash
yarn generate:asset-data
```

The script will update several .json files. These changes must be committed to source control.
