#!/bin/bash
grep -oE '@shapeshiftoss\/[a-z-]*' package.json | grep -v hdwallet | grep -v unchained | xargs yarn link
