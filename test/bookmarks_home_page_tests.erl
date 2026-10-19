-module(bookmarks_home_page_tests).
-include_lib("eunit/include/eunit.hrl").

homepage_test() ->
    {200, Body} = search(<<>>),
    ?assertEqual(18, length(binary:matches(Body, ~"target=\"_blank\""))),
    ?assertEqual(18, length(binary:matches(Body, ~"rel=\"noopener noreferrer\""))),
    ?assertEqual(1, length(binary:matches(Body, ~"<!doctype html>"))),
    {Amazon, _} = binary:match(Body, ~"title=\"Amazon\""),
    {Amex, _} = binary:match(Body, ~"title=\"American Express (amex)\""),
    {Youtube, _} = binary:match(Body, ~"title=\"Youtube\""),
    ?assert(Amazon < Amex),
    ?assert(Amex < Youtube),
    contains(Body, ~"href=\"https://news.ycombinator.com\""),
    contains(Body, ~"<title>Bookmarks</title>"),
    contains(Body, ~"autofocus"),
    contains(Body, ~"action=\"/\" method=\"get\""),
    contains(Body, ~"src=\"/static/search.js\"").

search_test() ->
    {200, Body} = search(~"q=HODINKEE"),
    ?assertEqual(2, length(binary:matches(Body, ~"target=\"_blank\""))),
    contains(Body, ~"title=\"Hodinkee\""),
    contains(Body, ~"title=\"Hodinkee Shop\""),
    contains(Body, ~"value=\"HODINKEE\""),
    ?assertEqual(nomatch, binary:match(Body, ~"title=\"Amazon\"")),
    {200, Encoded} = search(~"q=American+Express+%28amex%29"),
    ?assertEqual(1, length(binary:matches(Encoded, ~"target=\"_blank\""))),
    contains(Encoded, ~"href=\"https://americanexpress.com\"").

empty_and_unmatched_search_test() ->
    {200, Empty} = search(~"q="),
    ?assertEqual(18, length(binary:matches(Empty, ~"target=\"_blank\""))),
    {200, Unmatched} = search(~"q=does-not-exist"),
    ?assertEqual(nomatch, binary:match(Unmatched, ~"target=\"_blank\"")),
    contains(Unmatched, ~"value=\"does-not-exist\"").

escaped_search_test() ->
    {200, Body} = search(~"q=%22%3E%3Cscript%3Ealert%281%29%3C%2Fscript%3E"),
    ?assertEqual(nomatch, binary:match(Body, ~"<script>alert(1)</script>")),
    contains(Body, ~"&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;").

invalid_search_test() ->
    lists:foreach(fun(Query) -> ?assertMatch({400, _}, search(Query)) end,
        [~"q=%", ~"q=%FF", ~"q=one&q=two"]),
    ?assertMatch({414, _}, search(binary:copy(~"q", 8193))).

assets_and_private_data_test() ->
    App = zev:compile(bookmarks, #{port => 0}),
    lists:foreach(fun(Path) ->
        ?assertMatch(#{status := 200},
            zev_web:handle(App, zev_web:request(get, Path)))
    end, [~"/static/site.css", ~"/static/search.js", ~"/favicon.ico"]),
    lists:foreach(fun(Path) ->
        ?assertMatch(#{status := 404},
            zev_web:handle(App, zev_web:request(get, Path)))
    end, [~"/bookmarks.json", ~"/static/bookmarks.json", ~"/missing"]).

search(Query) ->
    App = zev:compile(bookmarks, #{port => 0}),
    Response = zev_web:handle(App,
        zev_web:request(get, ~"/", #{query_string => Query})),
    {maps:get(status, Response), iolist_to_binary(maps:get(body, Response))}.

contains(Body, Text) ->
    ?assertNotEqual(nomatch, binary:match(Body, Text)).
