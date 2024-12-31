# Asset data generation

Our asset data is generated periodically using a yarn script, with the result committed to source control.

### Before you start

The script requires a private Zerion API key. Request the key from the engineering team and set it as an environment variable:

```bash
export ZERION_API_KEY=<YOUR_ZERION_API_KEY>
```

### Running the script

Run the script:

```bash
yarn generate:asset-data
```

The script will update several .json files. These changes must be committed to source control.
