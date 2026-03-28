#!/bin/sh
set -eu

cd /app

alembic -c /app/alembic.ini upgrade head
