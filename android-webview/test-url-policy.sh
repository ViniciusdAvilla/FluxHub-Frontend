#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
javac -d "$TMP_DIR" app/src/main/java/com/fluxhub/mobile/UrlPolicy.java tests/UrlPolicyTest.java
java -cp "$TMP_DIR" com.fluxhub.mobile.UrlPolicyTest
