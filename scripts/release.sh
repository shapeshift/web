#!/bin/bash

# dirty repo comment

red=`tput setaf 1`
cyan=`tput setaf 6`
reset=`tput sgr0`
italic=`tput sitm`

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
  echo -e "\tcreate\t\tcreate a release branch"
  echo -e "\tmerge\t\tmerge a release branch into main"
  echo ""
  echo "version:"
  echo -e "\tmust be in the format vX.Y.Z, e.g. v1.0.0"
  exit
fi

set -e # exit automatically on error

if [[ -n $(git status --porcelain -uno) ]]; then # don't list untracked files
  echo "${red}Cannot continue because your repository is dirty${reset}"
  exit
fi

echo "${italic}Fetching latest repository state...${reset}"
git fetch -q

if [[ "$1" == "create" ]]; then
  echo ""
  echo "${cyan}Do you wish to create release branch ${red}$2${cyan}?${reset}"
  select yn in "Yes" "No"; do
    case $yn in
      Yes ) break;;
      No ) exit;;
    esac
  done

  echo ""
  echo "${italic}${cyan}Creating release branch ${red}$2${cyan}...${reset}"
  echo "Checking out latest develop branch..."
  git checkout -q origin/develop
  git checkout -q -b "releases/$2"
  echo "Pushing release branch to ${red}origin${reset}..."
  git push origin "releases/$2" 2> /dev/null
  echo ""
  echo "${cyan}Release branch ${red}$2${cyan} created${reset}"

  set +e # don't exit on non-zero status so we can display info if the GitHub CLI isn't installed
  hash gh &> /dev/null
  if [[ $? -eq 1 ]]; then
    echo "${red}To automatically create the release PR, install the GitHub CLI:${reset}"
    echo -e "\n\tbrew install gh\n"
    echo "${cyan}Title: ${red}chore: create release $2 [DO NOT MERGE]${reset}"
    echo ""
    echo "${cyan}Body:${reset}"
    echo "$(git log --oneline --first-parent "origin/main".."origin/releases/$2")"
    exit
  fi

  gh pr create --draft --base "main" --title "chore: create release $2 [DO NOT MERGE]" --body "$(git log --oneline --first-parent "origin/main".."origin/releases/$2")"
elif [[ "$1" == "merge" ]]; then
  # Check if branch exists
  if [[ -z $(git branch --list -r "origin/main") ]]; then
    echo "${red}branch ${cyan}'origin/main'${red} does not exist${reset}"
    exit
  fi

  if [[ -z $(git branch --list -r "origin/releases/$2") ]]; then
    echo "${red}branch ${cyan}'origin/releases/$2'${red} does not exist${reset}"
    exit
  fi

  echo "${italic}${cyan}Found release branch ${red}$2${reset}"
  echo ""
  git log --oneline --first-parent "origin/main".."origin/releases/$2"

  echo "Merge this release branch into main?"
  select yn in "Yes" "No"; do
    case $yn in
      Yes ) break;;
      No ) exit;;
    esac
  done

  echo ""
  echo "Checking out main branch..."
  git checkout -q "origin/main"
  echo "Merging release branch into main..."
  git merge --no-ff "origin/releases/$2" -m "Merge branch 'releases/$2'"
  echo ""
  echo "${italic}${red}Push this merge to the main branch?${reset}"
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

  echo ""
  echo "${cyan}Updating local \"main\" branch...${reset}"

  git fetch -q
  git checkout -q main
  git merge -q --ff-only origin/main

  echo ""
  echo "${cyan}Release ${red}$2${cyan} has been successfully merged to main${reset}"
else
  echo "${red}Unknown command: ${cyan}$1${reset}"
fi
