/** @jsx h */
import { h } from "preact";
import { tw } from "@twind";
import { Database } from "../utils/data.ts";
import { HandlerContext, Handlers, PageProps } from "$fresh/server.ts";

export const handler: Handlers = {
  async GET(req: Request, ctx: HandlerContext): Promise<Response> {
    const db = await new Database();
    const bookmarks = await db.getBookmarks();
    const categories = await db.getCategories();
    const resp = await ctx.render({bookmarks, categories});
    return resp;
  }
}

export default function Home(props: PageProps) {

  return (
    <div class={tw`p-4 mx-auto max-w-screen-md`}>
      <h1 class={tw`mb-2 font-bold text-2xl`}>Bookmarks</h1>
      {
        props.data.categories.map((category) => {
          
          const bm = props.data.bookmarks.filter((bookmark) => {
            return bookmark.category === category.id;
          })
          
          return (
            <div class={tw`my-4`}>
              <h2 class={tw`text-gray-400`}>{category.title}</h2>
              <ul>
                {
                  bm.map((bookmark) => {
                    return <li><a href={bookmark.url} target="_blank">{bookmark.title}</a></li>
                  })
                }
              </ul>
            </div>
          )
        })
      }
    </div>
  );
}
