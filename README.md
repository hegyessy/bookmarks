# Bookmarks

A browser homepage built with [Ze’ev](https://github.com/hegyessy/zev).
It lists the original 18 bookmarks alphabetically. Type part of a title and press
Enter to search; clear the search to return to the full list. Links open in a new
tab. Search is case insensitive and submitted searches work without JavaScript.

## Run locally

Install Erlang/OTP 28+ and rebar3, then run from this directory:

```sh
bin/zev server --port 4000
```

Open <http://127.0.0.1:4000/>. The first command fetches this project's pinned
Ze’ev 0.4.0 dependencies. Those currently use GitHub SSH URLs, so the build needs
an SSH key with access to `hegyessy/zev`. No database, Node, Deno, or frontend
build is needed to run the app. Stop the interactive server with `q().`.

```sh
bin/zev test
bin/zev build
```

Optional browser checks use Deno 2 and Playwright as test tools. Start the app
first, then in another terminal:

```sh
cd test/browser
deno task install
deno task test
```

Set `BOOKMARKS_URL` if the app uses a different address. These checks exercise
Chromium and WebKit, including keyboard search, clearing, new tabs, a narrow
viewport, and search with JavaScript disabled.

## Edit bookmarks

Edit `priv/bookmarks.json`, retaining the `bookmarks` array and each entry's
`title` and `url` strings. Use complete HTTP(S) URLs. The data is read on each
page request. It lives outside the public asset folders; it is included in the
release without being served as a downloadable JSON file. Rebuild and restart
a packaged app after changing its data.

The migration preserves every title and URL from `utils/bookmarks.yaml`; JSON
allows Erlang's built-in parser to read the data without a YAML dependency.
The homepage, templates, and stylesheet replace Fresh, Preact, and Twind. The
small `priv/static/search.js` handles clearing the search field; ordinary GET
forms provide the search itself. `priv/public/favicon.ico` retains the original
icon at `/favicon.ico`.

## Package and run

```sh
bin/zev release
PORT=4000 _build/prod/rel/bookmarks/bin/bookmarks foreground
```

The release includes Erlang and the app's templates, assets, and bookmark data.
It is specific to the build machine's OS and architecture. The app binds to
`127.0.0.1` by default; set `BIND_IP=0.0.0.0` when a hosting platform needs an
external listener. `PORT` selects the port. Local `.env` files are not loaded.

A `Dockerfile` is also included for a Linux release. Build it locally with
temporary SSH forwarding and trusted known-hosts, then deploy the resulting
private image. **Railway source builds reject this Dockerfile's SSH/secret
mounts.** Follow [Deploy to Railway](docs/railway.md) for the private-image path.
Do not copy credentials into the image or pass them as build arguments.

This migration does not change an existing deployment. The former Deno entry
point is replaced by an Erlang service, so hosting must support an OTP release
or the container before this branch is deployed.
