#!/usr/bin/env bash
# Claude Code status line — inspired by Oh My Zsh "fino" theme

input=$(cat)

cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd')
model=$(echo "$input" | jq -r '.model.display_name // "Claude"')
used=$(echo "$input" | jq -r '.context_window.used_percentage // empty')

user=$(whoami)
host=$(hostname -s)

# Shorten home directory to ~
short_cwd="${cwd/#$HOME/~}"

# Git branch and status (skip locks for safety)
git_info=""
if git -C "$cwd" rev-parse --git-dir --no-optional-locks > /dev/null 2>&1; then
  branch=$(git -C "$cwd" symbolic-ref --short HEAD 2>/dev/null || git -C "$cwd" rev-parse --short HEAD 2>/dev/null)
  if [ -n "$branch" ]; then
    if git -C "$cwd" status --porcelain --no-optional-locks 2>/dev/null | grep -q .; then
      git_info=" on ${branch}✘"
    else
      git_info=" on ${branch}✔"
    fi
  fi
fi

# Context usage indicator
ctx_info=""
if [ -n "$used" ]; then
  used_int=${used%.*}
  ctx_info=" | ctx:${used_int}%"
fi

# ANSI colors (dimmed-friendly)
GREEN='\033[38;5;40m'
GRAY='\033[38;5;239m'
BLUE='\033[38;5;33m'
YELLOW='\033[1;38;5;226m'
WHITE='\033[38;5;255m'
ORANGE='\033[38;5;202m'
RESET='\033[0m'

printf "╭─${GREEN}%s ${GRAY}at ${BLUE}%s ${GRAY}in ${YELLOW}%s${GRAY}%s${RESET} ${GRAY}[${WHITE}%s${ctx_info}${GRAY}]${RESET}\n" \
  "$user" "$host" "$short_cwd" "$git_info" "$model"
