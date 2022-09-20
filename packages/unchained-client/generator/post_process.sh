# post process script to add // @ts-nocheck to the start of each generated file
# there is a PR active to bake this into the generator that we can upgrade to when released:
# https://github.com/OpenAPITools/openapi-generator/pull/11674

SED_COMMAND_1='1s;^;// @ts-nocheck\n;'
SED_COMMAND_2='s;runtime\.TextApiResponse;runtime.JSONApiResponse;'
if [ "$(uname)" != "Darwin" ]; then
  sed -i "$SED_COMMAND_1" $1
  sed -i "$SED_COMMAND_2" $1
else
  sed -i '' "$SED_COMMAND_1" $1
  sed -i '' "$SED_COMMAND_2" $1
fi