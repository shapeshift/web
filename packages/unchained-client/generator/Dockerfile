FROM timbru31/java-node:11-jdk

RUN npm install @openapitools/openapi-generator-cli -g
RUN openapi-generator-cli version-manager set 5.4.0

ENTRYPOINT [ "openapi-generator-cli" ]