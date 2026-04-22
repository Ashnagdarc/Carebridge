#!/usr/bin/env bash
set -euo pipefail

TARGET_URL="${1:-http://localhost:3000}"
OUT_DIR="${2:-.zap}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to run OWASP ZAP baseline scan" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"

echo "Running OWASP ZAP baseline scan against: ${TARGET_URL}"
docker run --rm -t \
  -v "$(pwd)/${OUT_DIR}:/zap/wrk:rw" \
  owasp/zap2docker-stable \
  zap-baseline.py -t "${TARGET_URL}" -r zap-report.html

echo "ZAP report written to: ${OUT_DIR}/zap-report.html"
