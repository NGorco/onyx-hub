module Idpai.Pages.Loader

open System.IO
open System.Collections.Generic
open YamlDotNet.Serialization
open YamlDotNet.Serialization.NamingConventions

let private deserializer =
    DeserializerBuilder()
        .WithNamingConvention(CamelCaseNamingConvention.Instance)
        .IgnoreUnmatchedProperties()
        .Build()

let private toMap (d: Dictionary<string, string>) =
    if d = null then Map.empty
    else d |> Seq.map (fun kv -> kv.Key, kv.Value) |> Map.ofSeq

let private parse (yaml: string) : PageConfig option =
    try
        let y = deserializer.Deserialize<PageYaml>(yaml)
        if box y = null || y.Id = "" then None
        else
            Some {
                Id      = y.Id
                Title   = y.Title
                Route   = y.Route
                Columns = y.Columns
                Widgets =
                    [ for w in y.Widgets ->
                          { Plugin = w.Plugin
                            Widget = w.Widget
                            Size   = w.Size
                            Bare   = w.Bare
                            Params = toMap w.Params } ]
            }
    with ex ->
        eprintfn $"[pages] Parse error: {ex.Message}"
        None

let loadPages (pagesDir: string) : PageConfig list =
    if not (Directory.Exists pagesDir) then
        printfn $"[pages] Directory not found: {pagesDir}"
        []
    else
        [ for file in Directory.GetFiles(pagesDir, "*.yml") do
              match parse (File.ReadAllText file) with
              | Some p ->
                  printfn $"[pages] Loaded page: {p.Title} ({p.Route})"
                  yield p
              | None ->
                  eprintfn $"[pages] Skipped invalid page: {file}" ]
