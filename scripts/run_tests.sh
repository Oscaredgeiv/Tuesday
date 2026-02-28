#!/bin/bash
# Run the full test + lint suite
set -e

echo "=== Running tests ==="
python -m pytest -v

echo ""
echo "=== Running linter ==="
python -m ruff check .

echo ""
echo "=== Checking format ==="
python -m ruff format --check .

echo ""
echo "All checks passed!"
