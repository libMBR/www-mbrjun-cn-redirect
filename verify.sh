#!/usr/bin/env bash
# 验收 301 行为。用法：bash verify.sh <host 或 base-url>
#   bash verify.sh www.mbrjun.cn
set -u
BASE=${1:?usage: verify.sh <host|base-url>}
case "$BASE" in http*) ;; *) BASE="https://$BASE" ;; esac

pass=0; fail=0
check() {
  local path=$1 expect=$2
  local url="$BASE$path"
  local out code loc
  out=$(curl -s -m 10 -o /dev/null -w "%{http_code}|%{redirect_url}" "$url")
  code=${out%%|*}; loc=${out#*|}
  if [ "$code" = "301" ] && [ "$loc" = "$expect" ]; then
    printf "PASS  %-32s -> %s\n" "$path" "$loc"; pass=$((pass+1))
  else
    printf "FAIL  %-32s got %s -> %s\n                               want 301 %s\n" "$path" "$code" "$loc" "$expect"; fail=$((fail+1))
  fi
}

check "/"                          "https://www.libmbr.com/"
check "/foo"                       "https://www.libmbr.com/foo"
check "/archives/520/"             "https://www.libmbr.com/archives/520/"
check "/assets/css/style.min.css"  "https://www.libmbr.com/assets/css/style.min.css"
check "/foo/"                      "https://www.libmbr.com/foo/"
check "/foo?x=1"                   "https://www.libmbr.com/foo?x=1"

printf "\n%d passed, %d failed\n" "$pass" "$fail"
[ "$fail" -eq 0 ]
