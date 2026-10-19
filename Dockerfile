# syntax=docker/dockerfile:1

# Build this image locally with BuildKit, then deploy the private image.
# Railway rejects SSH/secret mounts in source builds; see docs/railway.md.
# Build the release on Linux, using the same Debian version as the runtime.
FROM erlang:28.4.1 AS build
WORKDIR /build
COPY . .

# Optional VM flags for local builds (for example, +JMsingle true under Rosetta).
# They apply only to the build stage, never to the runtime image.
ARG ERL_FLAGS

# Credentials are optional, temporary BuildKit mounts; never COPY private keys.
# Forward an SSH agent and mount trusted known_hosts for private Git dependencies.
# A gitconfig secret can supply Git URL rewrites or a credential helper instead.
RUN --mount=type=ssh \
    --mount=type=secret,id=known_hosts,target=/root/.ssh/known_hosts \
    --mount=type=secret,id=gitconfig,target=/root/.gitconfig \
    bin/zev release

FROM debian:trixie-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libncurses6 libssl3t64 libstdc++6 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1000 app \
    && useradd --uid 1000 --gid app --home-dir /app --no-create-home app

WORKDIR /app
COPY --from=build --chown=app:app /build/_build/prod/rel/bookmarks/ ./
ENV LANG=C.UTF-8 PORT=8080 BIND_IP=0.0.0.0
USER app:app
EXPOSE 8080
ENTRYPOINT ["/app/bin/bookmarks"]
CMD ["foreground"]
