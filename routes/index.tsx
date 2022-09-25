/** @jsx h */
import { h } from "preact";
import { tw } from "@twind";
import { Handlers, PageProps } from "$fresh/server.ts";
import { parse } from "https://deno.land/std@0.149.0/encoding/yaml.ts";
import SearchBookmarks from "../islands/SearchBookmarks.tsx";

type Bookmark = {
  title: string;
  url: string;
};

type Bookmarks = {
  bookmarks: Bookmark[];
};

export const handler: Handlers = {
  async GET(req, ctx) {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";
    const yaml = await Deno.readTextFile("utils/bookmarks.yaml");
    const parsed = await parse(yaml);

    const { bookmarks } = parsed as Bookmarks;
    if (!parsed) {
      return ctx.render(null);
    }

    const data = bookmarks.filter((bookmark) =>
      bookmark.title.toLowerCase().includes(query)
    ).sort((a, b) => a.title < b.title ? -1 : 1);

    return ctx.render({ data, query });
  },
};

export default function Home(props: PageProps) {
  const data = props.data.data;

  return (
    <div class={tw`p-4 mx-auto max-w-screen-md`}>
      <h1 class={tw`mb-2 font-bold text-2xl`}>Bookmarks</h1>
      <SearchBookmarks query={props.data.query} />
      <div id="bookmarks" class={tw`flex flex-col`}>
        {data.map(({ title, url }: Bookmark) => {
          return <Bookmark title={title} url={url} />;
        })}
      </div>
    </div>
  );
}

export const Bookmark = ({ title, url }: Bookmark) => {
  return (
    <a
      href={url}
      title={title}
      target="_blank"
      class={tw`text-gray-200 hover:text-blue-400`}
    >
      <span class={tw`text-gray-900 mr-2`}>{title}</span>
      <span class={tw``}>{url}</span>
    </a>
  );
};
