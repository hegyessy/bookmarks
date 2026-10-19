# Deploy a verified Linux release to Railway

Ze’ev is currently a private Git dependency. Railway's source-build validator
rejects `RUN --mount=type=ssh` and `type=secret`; it allows only cache mounts.
Build the Linux image locally with temporary credentials, verify it, then upload
its packaged release using the helper below. Railway builds only the runtime
layer, with no GitHub credentials or private Git fetches.

This works on the existing Hobby plan. Pulling an image directly from a private
registry is a separate option that requires Railway Pro.

## Build and verify locally

From the app root, with Docker BuildKit and a GitHub SSH key loaded in your SSH
agent:

```sh
revision=$(git rev-parse --short=12 HEAD)
image="bookmarks:$revision"
docker build --platform linux/amd64 \
  --ssh default \
  --secret "id=known_hosts,src=$HOME/.ssh/known_hosts" \
  --tag "$image" .
```

The key must have read access to `hegyessy/zev`, and `known_hosts` must already
contain trusted GitHub host keys. The Dockerfile also accepts an optional
`gitconfig` secret for an existing credential-helper setup. Keep credentials out
of the build context and build arguments.

On Apple Silicon, Erlang's JIT may fail under x86 user-space emulation. Add
`--build-arg 'ERL_FLAGS=+JMsingle true'` to the build command in that case. This
flag applies only to the build stage. With Apple's `container` tool, replace
`docker build` with `container build` and use the same options.

```sh
docker run --rm -p 127.0.0.1:4000:8080 "$image"
```

Open <http://127.0.0.1:4000/> and run the browser checks from the README. On Apple
Silicon, add `-e 'ERL_FLAGS=+JMsingle true'` when running the x86 image under
emulation. Stop the local test with Ctrl-C. The normal image runs as UID 1000,
binds to `0.0.0.0`, and defaults to port 8080. Railway's `PORT` overrides it.

## Prepare a private upload

```sh
context=$(scripts/prepare-railway "$image")
```

The helper uses Docker, or Apple's `container` when Docker is absent. Set
`BOOKMARKS_CONTAINER_ENGINE=docker` or `container` to choose explicitly. It
extracts `/app` from the Linux image without starting Erlang and creates a
private temporary directory containing `release/` and a runtime-only Dockerfile
based on the root Dockerfile's runtime stage. No private dependency source or
credential files are needed. The directory contains compiled private libraries;
keep it out of Git and public artifact stores.

For the existing bookmarks service, disconnect the GitHub source once so future
merges do not trigger the unsupported source build:

```sh
railway service source disconnect \
  --project 89810a00-544b-4b32-b669-c961406e0a8b \
  --environment 89e6cdcb-f4fc-465f-86d6-e9c99e6bc99f \
  --service 5cdd2373-d678-4aad-bd4d-19bc873faeb0
```

Upload and deploy only the prepared directory:

```sh
railway up "$context" --path-as-root \
  --project 89810a00-544b-4b32-b669-c961406e0a8b \
  --environment 89e6cdcb-f4fc-465f-86d6-e9c99e6bc99f \
  --service 5cdd2373-d678-4aad-bd4d-19bc873faeb0 \
  --ci -m "Deploy verified bookmarks Linux release"
```

Leave the custom start command empty; the image starts the release. Use `/` for
the HTTP healthcheck and route the domain to the configured port. Confirm the
exact deployment reports **SUCCESS**, then check the public homepage, search,
clearing, favicon, and stylesheet. There is no database or volume to migrate.
Remove the temporary context once the upload and verification are complete.
Future updates require rebuilding, verifying, preparing, and uploading again;
merging a commit alone no longer deploys this service.

## Optional private registry copy

You can also retain the tested image privately in GHCR. Authenticate with a
package-writing credential, tag the image, and push it. With GitHub CLI:

```sh
gh auth refresh --hostname github.com --scopes write:packages,read:packages
gh auth token | docker login ghcr.io --username hegyessy --password-stdin
docker tag "$image" "ghcr.io/hegyessy/bookmarks:$revision"
docker push "ghcr.io/hegyessy/bookmarks:$revision"
```

New GHCR packages default to private. Verify **Private** in the package settings;
do not link it to the public repository or enable inherited public access. The
image contains compiled private Ze’ev libraries. With Apple's tools, use
`container registry login`, `container image tag`, and `container image push`.

On Railway Pro, an alternative to CLI uploads is to set the service source to
the private image's immutable `ghcr.io/hegyessy/bookmarks@sha256:…` digest and
supply a `read:packages` credential in the private-registry settings. This option
is unavailable on Hobby; changing plans is not part of the deployment helper.

References: [Railway Dockerfiles](https://docs.railway.com/builds/dockerfiles),
[private-registry plan requirements](https://docs.railway.com/builds/private-registries),
[GHCR visibility](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry),
[OTP's emulation workaround](https://github.com/erlang/otp/issues/10355).
