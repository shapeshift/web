#!/bin/bash

IMAGE=shapeshiftdao/openapi-generator-cli-v5.4.0
USER=$(id -u):$(id -g)
ROOTDIR=$(git rev-parse --show-toplevel)/packages/unchained-client
GENDIR=$(pwd)/generator

while getopts ':e:h' flag; do
    case "${flag}" in
        e) env=${OPTARG};;
		h) echo -e "Usage: $(basename $0) -e (local|dev|public)" && exit 1;;
		:) echo -e "Option requires an argument.\nUsage: $(basename $0) -e (local|dev|public)" && exit 1;;
    	?) echo -e "Invalid command option.\nUsage: $(basename $0) -e (local|dev|public)" && exit 1;;
    esac
done

if [[ $env == "" ]]; then
	echo -e "Usage: $(basename $0) -e (local|dev|public)" && exit 1
fi

docker run --platform=linux/amd64 --rm --user $USER -e JAVA_OPTS='-Dlog.level=error' -v "$ROOTDIR:$ROOTDIR" -w $GENDIR/$env $IMAGE generate

exit 0
