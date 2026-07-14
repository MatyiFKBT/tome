#!/usr/bin/env bash
set -euo pipefail

# Sync fork with upstream Tome, keeping local patches on top.
# Usage: ./sync-fork.sh
#
# Prerequisites:
#   git remote add upstream https://github.com/<original-owner>/tome.git
#   (run once, then this script handles the rest)

if ! git remote get-url upstream &>/dev/null; then
    echo "Error: 'upstream' remote not found."
    echo "Add it with: git remote add upstream https://github.com/<original-owner>/tome.git"
    exit 1
fi

branch=$(git branch --show-current)
echo "Fetching upstream..."
git fetch upstream

echo "Rebasing $branch onto upstream/main..."
if git rebase upstream/main; then
    echo "Rebase succeeded. Pushing to origin..."
    git push --force-with-lease origin "$branch"
    echo "Done. Fork is now in sync with upstream."
else
    echo ""
    echo "Rebase has conflicts. Resolve them, then:"
    echo "  git add <resolved-files>"
    echo "  git rebase --continue"
    echo "  git push --force-with-lease origin $branch"
    exit 1
fi
