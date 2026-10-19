-module(bookmarks_home_page).
-moduledoc false.
-behaviour(zev_page).
-export([get/1, render/1]).

get(Ctx) ->
    case zev_http:query(Ctx) of
        {ok, Fields} ->
            Query = maps:get(~"q", Fields, <<>>),
            {render, #{title => ~"Bookmarks", query => Query,
                       bookmarks => search(Query)}};
        {error, Status} ->
            zev_http:text(Status, ~"Invalid search query")
    end.

render(Ctx) ->
    zev_view:template(Ctx, ~"home",
        #{scripts => [zev_assets:url(Ctx, ~"search.js")]}).

search(Query) ->
    Path = filename:join(code:priv_dir(bookmarks), "bookmarks.json"),
    {ok, Json} = file:read_file(Path),
    #{~"bookmarks" := Bookmarks} = json:decode(Json),
    Needle = string:casefold(Query),
    Matches = [Bookmark || #{~"title" := Title} = Bookmark <- Bookmarks,
        string:find(string:casefold(Title), Needle) =/= nomatch],
    lists:sort(fun(#{~"title" := A}, #{~"title" := B}) -> A =< B end, Matches).
