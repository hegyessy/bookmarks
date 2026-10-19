#!/usr/bin/env escript
%% -*- erlang -*-
-mode(compile).

main(Args) ->
    Root = filename:dirname(filename:dirname(filename:absname(escript:script_name()))),
    Checkout = filename:join(Root, "apps/zev_cli"),
    Package = case filelib:is_file(filename:join(Checkout, "src/zev_cli.erl")) of
        true -> Checkout;
        false -> dependency(Root, Args)
    end,
    %% Bootstrap only the CLI, so generators still work when app code will not compile.
    lists:foreach(fun(Module) ->
        File = filename:join([Package, "src", atom_to_list(Module) ++ ".erl"]),
        case compile:file(File, [binary, report_errors, report_warnings, warnings_as_errors]) of
            {ok, Module, Beam} -> {module, Module} = code:load_binary(Module, File, Beam);
            _ -> halt(1)
        end
    end, [zev_cli_files, zev_cli_scaffold, zev_cli]),
    halt(zev_cli:run(Args, Package)).

dependency(Root, Args) ->
    %% git_subdir keeps the package's repository-relative directory inside its checkout.
    %% Do not substitute a global CLI: this launcher must plan with the exact
    %% version pinned by the project, including before a dry run.
    Package = filename:join(Root, "_build/default/lib/zev_cli/apps/zev_cli"),
    case filelib:is_file(filename:join(Package, "src/zev_cli.erl")) of
        true -> Package;
        false ->
            case Args of
                ["doctor" | _] -> fail("This project's pinned CLI is not cached. Doctor will not fetch dependencies. Run the globally installed zev doctor to inspect this project, or run rebar3 get-deps separately.");
                _ -> ok
            end,
            io:put_chars("Bootstrapping this project's pinned Ze'ev CLI with rebar3.\n"),
            case lists:member("--dry-run", Args) of
                true -> io:put_chars("--dry-run prevents project source writes after bootstrap; a cold dependency cache still uses the network and writes build/cache files.\n");
                false -> ok
            end,
            fetch(Root),
            case filelib:is_file(filename:join(Package, "src/zev_cli.erl")) of
                true -> Package;
                false -> fail("Cannot find zev_cli after fetching dependencies. Check rebar.config.")
            end
    end.

fetch(Root) ->
    case os:find_executable("rebar3") of
        false -> fail("rebar3 is required on PATH to fetch Ze'ev. Install it and retry.");
        Exe ->
            Port = open_port({spawn_executable, Exe},
                [exit_status, nouse_stdio, {args, ["get-deps"]}, {cd, Root}]),
            receive
                {Port, {exit_status, 0}} -> ok;
                {Port, {exit_status, Status}} ->
                    io:put_chars(standard_error,
                        "zev: Dependency bootstrap failed. Review the Git/Rebar detail above. "
                        "Likely causes include blocked network access, missing repository permission, "
                        "or SSH credentials that cannot authenticate to GitHub.\n"),
                    halt(Status)
            end
    end.

fail(Message) -> io:format(standard_error, "zev: ~s~n", [Message]), halt(1).
