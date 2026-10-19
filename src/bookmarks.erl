-module(bookmarks).
-moduledoc false.
-behaviour(zev_app).
-export([routes/0, config/0]).

routes() ->
    [
        {get, <<"/">>, zev_view:page(bookmarks_home_page)}
    ].

config() ->
    {ok, Ip} = inet:parse_address(os:getenv("BIND_IP", "127.0.0.1")),
    #{ip => Ip, views => #{layout => ~"layouts/site"}}.
