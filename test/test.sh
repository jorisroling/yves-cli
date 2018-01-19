#!/bin/bash

ROOT="$(dirname $(realpath "$0"))/.."
YVES="node ${ROOT}/cli.js"

fail() {
	 echo "Failed test \"$1\""
	 exit 1
}

$YVES "${ROOT}/package.json" || fail "file"
$YVES <( echo "{\"a\":9}" ) || fail "stdin echo"
$YVES <( curl -s "https://api.github.com/users/jorisroling" ) || fail "stdin curl"
$YVES --query "{\"id\": 199356}" < "${ROOT}/test/fixtures/c.json" || fail "stdin fixture"

echo "No failures!"

