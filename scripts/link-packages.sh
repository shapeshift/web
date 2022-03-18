#!/bin/bash
grep -oE '@shapeshiftoss\/[a-z-]*' package.json | grep -v hdwallet | xargs yarn link
