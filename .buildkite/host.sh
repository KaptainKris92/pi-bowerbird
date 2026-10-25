#!/usr/bin/env bash
# Node preflight for the mac-mini agent. package.json engines require Node >= 22.
set -euo pipefail
command -v node >/dev/null
command -v npm >/dev/null
node -e 'const major = Number(process.versions.node.split(".")[0]); if (!(major >= 22)) { console.error("Node >= 22 required, found " + process.version); process.exit(1); }'
echo "node $(node --version) / npm $(npm --version)"
