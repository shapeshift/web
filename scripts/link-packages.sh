#!/bin/bash
grep -oE '@shapeshiftoss\/[a-z-]*' package.json | grep -v -e hdwallet -e web | xargs yarn link
