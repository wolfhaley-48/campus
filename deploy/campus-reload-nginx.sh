#!/bin/sh
# Install as /etc/letsencrypt/renewal-hooks/deploy/campus-reload-nginx.sh.
set -eu
systemctl reload nginx
