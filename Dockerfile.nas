# Package the production output verified by `npm test` before deployment.
FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:15c994d10d6d78658721c3bcafff14cb281fba2a4bdf9d5ba92c416a472516e3
ARG SOURCE_REVISION
LABEL org.opencontainers.image.source="https://github.com/k55063844-ctrl/game-time-machine" \
      org.opencontainers.image.revision="${SOURCE_REVISION}"
COPY deploy/nas/nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/
