#!/bin/sh
# Entry point of the API in docker-compose.yml (nest start --watch --exec).
# Nest CLI compiles once and calls this script after every successful build with
# the node arguments ("--enable-source-maps dist/main"). Pending migrations run
# from that same build, so a new migration is applied on save; then the script
# is replaced by node (exec), which keeps the PID the CLI stops on each reload.
set -e

node ./node_modules/typeorm/cli.js migration:run --dataSource dist/config/data-source.js
exec node "$@"
