#!/bin/sh
set -e

SEED_MARKER="/app/data/.seeded"

if [ ! -f "$SEED_MARKER" ]; then
  echo "⏳ Running database seed..."
  npm run seed
  touch "$SEED_MARKER"
else
  echo "✅ Data already seeded, skipping."
fi

exec npm start
