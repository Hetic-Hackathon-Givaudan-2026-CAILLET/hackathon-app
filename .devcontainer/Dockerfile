# Même base que l'image de production : Node 24 sur Debian trixie
FROM mcr.microsoft.com/devcontainers/typescript-node:24-trixie

# Miroir Debian optionnel, pour les réseaux qui bloquent deb.debian.org
# (et security.debian.org). Vide par défaut : dépôts officiels.
# Exemple dans le .env racine : DEBIAN_MIRROR=http://ftp.fr.debian.org/debian
ARG DEBIAN_MIRROR=""

# Client PostgreSQL (psql 17, comme le serveur)
RUN if [ -n "$DEBIAN_MIRROR" ]; then \
      sed -i -e 's|http://security.debian.org/debian-security|http://deb.debian.org/debian-security|g' \
             -e "s|http://deb.debian.org/debian|${DEBIAN_MIRROR}|g" \
             /etc/apt/sources.list.d/debian.sources; \
    fi \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*
