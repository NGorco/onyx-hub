module Idpai.Plugins.Loader

open System.IO
open System.Text.Json

let private str (el: JsonElement) (prop: string) def =
    match el.TryGetProperty(prop) with
    | true, v when v.ValueKind = JsonValueKind.String -> v.GetString()
    | _ -> def

let private strArr (el: JsonElement) (prop: string) =
    match el.TryGetProperty(prop) with
    | true, v when v.ValueKind = JsonValueKind.Array -> [ for item in v.EnumerateArray() -> item.GetString() ]
    | _ -> []

let parseManifest (json: string) =
    use doc = JsonDocument.Parse(json)
    let r = doc.RootElement

    let ui =
        match r.TryGetProperty("ui") with
        | true, u ->
            let nav =
                match u.TryGetProperty("nav") with
                | true, n ->
                    { Label = str n "label" ""
                      Icon = str n "icon" "puzzle" }
                | _ ->
                    { Label = str r "name" ""
                      Icon = "puzzle" }

            Some
                { Entry = str u "entry" "ui/index.js"
                  Route = str u "route" "/"
                  Nav = nav }
        | _ -> None

    let widgets =
        match r.TryGetProperty("widgets") with
        | true, arr when arr.ValueKind = JsonValueKind.Array ->
            [ for w in arr.EnumerateArray() ->
                  { Id    = str w "id" ""
                    Name  = str w "name" ""
                    Entry = str w "entry" "index.js" } ]
        | _ -> []

    { Id = str r "id" ""
      Name = str r "name" ""
      Version = str r "version" "0.0.0"
      Description = str r "description" ""
      Widgets = widgets
      Ui = ui
      Be = None }

let parseHandlers (json: string) =
    use doc = JsonDocument.Parse(json)
    let r = doc.RootElement

    match r.TryGetProperty("endpoints") with
    | true, eps ->
        [ for ep in eps.EnumerateArray() ->
              let op =
                  match ep.TryGetProperty("operation") with
                  | true, o ->
                      { Type = str o "type" "get"
                        Prefix = str o "prefix" ""
                        KeyPrefix = str o "keyPrefix" ""
                        KeyFrom = str o "keyFrom" "body.id"
                        Url = str o "url" ""
                        Dir = str o "dir" "" }
                  | _ ->
                      { Type = "get"
                        Prefix = ""
                        KeyPrefix = ""
                        KeyFrom = ""
                        Url = ""
                        Dir = "" }

              { Method = str ep "method" "GET"
                Path = str ep "path" ""
                Description = str ep "description" ""
                Tags = strArr ep "tags"
                Operation = op } ]
    | _ -> []

let loadPlugins (pluginsDir: string) (registry: PluginRegistry) =
    if Directory.Exists(pluginsDir) then
        for dir in Directory.GetDirectories(pluginsDir) do
            let mfPath = Path.Combine(dir, "manifest.json")

            if File.Exists(mfPath) then
                try
                    let manifest = parseManifest (File.ReadAllText(mfPath))

                    let endpoints =
                        let hPath = Path.Combine(dir, "be", "handlers.json")

                        if File.Exists(hPath) then
                            parseHandlers (File.ReadAllText(hPath))
                        else
                            []

                    let manifest =
                        { manifest with
                            Be =
                                if endpoints.IsEmpty then
                                    None
                                else
                                    Some { Endpoints = endpoints } }

                    registry.Register(
                        { Manifest = manifest
                          Directory = dir
                          Endpoints = endpoints }
                    )

                    printfn $"[plugin] Loaded: {manifest.Name} ({manifest.Id})"
                with ex ->
                    eprintfn $"[plugin] Error loading {dir}: {ex.Message}"
    else
        printfn $"[plugin] Directory not found: {pluginsDir}"
