# NAS deployment

This is a standalone static website. Build and verify it with Node.js 22.12 or
newer before packaging the `dist/` directory:

```sh
npm ci --no-audit --no-fund
npm test
docker compose -p game-time-machine -f compose.nas.yaml up -d --build --wait
```

The default listener is `http://192.168.31.151:18081`. Override
`GAME_BIND_ADDRESS` and `GAME_PORT` for another host. Set `GAME_RELEASE` and
`SOURCE_REVISION` to identify a deployment. The Nginx image is pinned by digest.

`Dockerfile.nas` packages the locally verified production output; it does not
install dependencies or rebuild source on the NAS. The deployment bundle needs
`dist/`, `Dockerfile.nas`, `.dockerignore`, `compose.nas.yaml`, and
`deploy/nas/nginx.conf`. `/healthz` returns HTTP 200 when the web server is ready.

The website uses absolute `/assets/` paths, so serve it at the root of its port
or domain. Records live in each browser's localStorage. There is no server
database, shared leaderboard, account system, or required NAS data volume.
Keep `VITE_SCORE_API_URL` empty for the project's existing local-record mode.

NAS releases are stored under `/home/skymoonzyj/game-time-machine/releases/`.
The `current` symlink identifies the verified active release. Its `release.env`
file records the source revision, image tag, and listener settings. To restart:

```sh
cd /home/skymoonzyj/game-time-machine/current
docker compose --env-file release.env -p game-time-machine -f compose.nas.yaml up -d --wait
```
