# Deploy to Railway from a private image

Ze’ev is currently a private Git dependency. Railway's source-build validator
rejects `RUN --mount=type=ssh` and `type=secret`; it allows only cache mounts.
The app's Dockerfile uses those mounts intentionally for a local BuildKit build.
Build and push a private Linux image, then configure Railway to pull that image
instead of building the GitHub repository. GitHub authentication stays outside
the image and outside Railway's build arguments.

## Build locally

From the app root, with Docker BuildKit and a GitHub SSH key loaded in your SSH
agent:

```sh
revision=$(git rev-parse --short=12 HEAD)
image="ghcr.io/hegyessy/bookmarks:$revision"
docker build --platform linux/amd64 \
  --ssh default \
  --secret "id=known_hosts,src=$HOME/.ssh/known_hosts" \
  --tag "$image" .
```

The SSH key must have read access to `hegyessy/zev`, and `known_hosts` must
already contain trusted GitHub host keys. The Dockerfile also accepts an
optional `gitconfig` secret for an existing Git credential-helper setup.
Never put credentials in the Docker build context.

On Apple Silicon, Erlang's JIT may fail under x86 user-space emulation before
compilation starts. Add `--build-arg 'ERL_FLAGS=+JMsingle true'` to the build
command in that case. This flag applies only to the build stage. With Apple's
`container` tool, replace `docker build` with `container build` and use the same
platform, SSH, secret, and tag options.

Test the image locally before publishing:

```sh
docker run --rm -p 127.0.0.1:4000:8080 "$image"
```

Open <http://127.0.0.1:4000/>. On Apple Silicon, add
`-e 'ERL_FLAGS=+JMsingle true'` when running the x86 image under emulation.
The normal image uses UID 1000, binds to `0.0.0.0`, and defaults to port 8080.
Railway's `PORT` variable overrides the default. Stop the local test with Ctrl-C.

## Publish privately

Use a registry credential authorized to write the package. With GitHub CLI:

```sh
gh auth refresh --hostname github.com --scopes write:packages,read:packages
gh auth token | docker login ghcr.io --username hegyessy --password-stdin
docker push "$image"
```

New GHCR packages are private by default. Verify the `bookmarks` package is
**Private** in GitHub's package settings before connecting Railway. Do not
change it to public: the image includes compiled private Ze’ev libraries.
Record the pushed image's SHA-256 digest for an immutable deployment reference.
With Apple's tooling, use `container registry login` and `container image push`.

## Configure the existing Railway service

In the **bookmarks** service in project **steadfast-reprieve**, production:

1. Change the service source from `hegyessy/bookmarks` to the private image.
2. Set the image reference to `ghcr.io/hegyessy/bookmarks@sha256:…`, using the
   actual digest returned by the registry.
3. Supply a GitHub registry credential with `read:packages` access in Railway's
   private-registry settings. Keep it out of service build arguments and source.
4. Leave the custom start command empty so the image's entrypoint starts the
   release. Use `/` for the HTTP healthcheck and route the public domain to the
   app's configured port.
5. Deploy and confirm Railway reports **SUCCESS**, then check the public
   homepage, search, clear behavior, favicon, and stylesheet.

There is no database or volume to migrate. Future Git commits do not update an
image-based service automatically: build, test, push a new private image, then
update its digest in Railway. Keep the previous digest for rollback.

References: [Railway Dockerfiles](https://docs.railway.com/builds/dockerfiles),
[private registries](https://docs.railway.com/builds/private-registries),
[GHCR visibility](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry),
[OTP's emulation workaround](https://github.com/erlang/otp/issues/10355).
