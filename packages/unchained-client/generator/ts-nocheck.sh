# post process script to add // @ts-nocheck to the start of each generated file
# there is a PR active to bake this into the generator that we can upgrade to when released:
# https://github.com/OpenAPITools/openapi-generator/pull/11674

SED_COMMAND='1s;^;// @ts-nocheck\n;'
if [ "$(uname)" != "Darwin" ]; then
  sed -i "$SED_COMMAND" $1
else
  sed -i '' "$SED_COMMAND" $1
fi