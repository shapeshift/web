#!/bin/bash
set -e

hash git &> /dev/null
if [[ $? -eq 1 ]]; then
    echo >&2 "git is not installed"
fi

if [[ -z $1 || -z $2 ]]; then
  echo "This script will create a release branch and merge it into main"
  echo ""
  echo "Syntax: release.sh {command} {version}"
  echo ""
  echo "commands:"
  echo -e "\trelease\t\tcreate a release branch"
  echo -e "\tmain\t\tmerge a release branch into main"
  echo ""
  echo "version:"
  echo -e "\tmust be in the format vX.Y.Z, e.g. v1.0.0"
  exit
fi

if [[ -n $(git status -s) ]]; then
  echo "Cannot continue because your repository is dirty"
  exit
fi

echo "Fetching latest repository state..."
git fetch &> /dev/null

if [[ "$1" == "release" ]]; then
  echo "Do you wish to create release branch $2?"
  select yn in "Yes" "No"; do
    case $yn in
      Yes ) break;;
      No ) exit;;
    esac
  done

  echo ""
  echo "Creating release branch $2..."
  echo "Checking out latest develop branch..."
  git checkout origin/develop &> /dev/null
  git checkout -b "releases/$2" &> /dev/null
  echo "Pushing release branch to origin..."
  git push origin "releases/$2" 2> /dev/null
  echo ""
  echo "Release branch $2 created"
elif [[ "$1" == "main" ]]; then
  # Check if branch exists
  if [[ -z $(git branch --list -r "origin/main") ]]; then
    echo "branch 'origin/main' does not exist"
    exit
  fi

  if [[ -z $(git branch --list -r "origin/releases/$2") ]]; then
    echo "branch 'origin/releases/$2' does not exist"
    exit
  fi

  echo "Found release branch:"
  echo ""
  git show "origin/releases/$2"

  echo "Merge this release branch into main?"
  select yn in "Yes" "No"; do
    case $yn in
      Yes ) break;;
      No ) exit;;
    esac
  done

  echo ""
  echo "Checking out main branch..."
  git checkout "origin/main" &> /dev/null
  echo "Merging release branch into main..."
  git merge --no-ff "origin/releases/$2" -m "Merge branch 'releases/$2'"
  echo ""
  echo "Push this merge to the main branch?"
  select yn in "Yes" "No"; do
    case $yn in
      Yes ) break;;
      No ) exit;;
    esac
  done

  echo ""
  git tag -a -m "$2" "$2"
  git push origin HEAD:main --tags

  echo ""
  echo "Deleting release branch..."
  git push --delete origin "releases/$2" &> /dev/null

  echo "Release $2 has been successfully merged to main"
fi
