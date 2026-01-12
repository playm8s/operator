#!/bin/bash

# where this .sh file lives
DIRNAME=$(dirname "$0")
SCRIPT_DIR=$(cd "$DIRNAME" || exit 1; pwd)
cd "$SCRIPT_DIR" || exit 1

# Get the current version from package.json
CURRENT_VERSION=$(jq -r '.version' package.json)

# Function to increment the version
increment_version() {
  local version=$1
  local major=$(echo "$version" | cut -d'.' -f1)
  local minor=$(echo "$version" | cut -d'.' -f2)
  local patch=$(echo "$version" | cut -d'.' -f3)
  echo "$major.$minor.$((patch + 1))"
}

# Increment the patch version
VERSION=$(increment_version "$CURRENT_VERSION")

export VERSION

jq ".version = \"${VERSION}\"" package.json | tee package.json.new

mv package.json.new package.json

npm install --include=dev --legacy-peer-deps

git add package.json package-lock.json

git commit -m "${VERSION} - $*"

git tag "${VERSION}"

git push \
&& git push --tags || git tag -d "${VERSION}"
