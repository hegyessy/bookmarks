/** @jsx h */
import { h } from "preact";
import { tw } from "@twind";
import { Database } from "../utils/data.ts";
import { gitHubApi } from "../utils/githubapi.ts";
import { getCookies, setCookie } from "https://deno.land/std@0.143.0/http/cookie.ts";
import { HandlerContext, Handlers, PageProps } from "$fresh/server.ts";

export const handler: Handlers = {
  async GET(req: Request, ctx: HandlerContext): Promise<Response> {
    const db = await new Database();
    const bookmarks = await db.getBookmarks();
    const categories = await db.getCategories();
    const verifyAccessToken = getCookies(req.headers)["bookmarks_token"];

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    let resp;

    if (!code) {
      resp = await ctx.render({bookmarks, categories});
    } else {
      const accessToken = await gitHubApi.getAccessToken(code);
      const userData = await gitHubApi.getUserData(accessToken);
      
      resp = await ctx.render({bookmarks, categories, userData});
      
      setCookie(resp.headers, {
        name: "bookmarks_token",
        value: accessToken,
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: true,
      });
    }
    return resp;
  }
}

export default function Home(props: PageProps) {
  console.log(props)
  return (
    <div class={tw`p-4 mx-auto max-w-screen-md`}>
      <h1 class={tw`mb-2 font-bold text-2xl`}>Bookmarks</h1>
      <a href="/api/login">Login</a>
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
