namespace Idpai.Plugins

open System.Collections.Concurrent

type PluginRegistry() =
    let plugins = ConcurrentDictionary<string, LoadedPlugin>()
    let apis = ResizeArray<ApiEntry>()
    let apisLock = obj ()

    member _.Register(plugin: LoadedPlugin) =
        plugins[plugin.Manifest.Id] <- plugin

        lock apisLock (fun () ->
            for ep in plugin.Endpoints do
                let fullPath = $"/api/plugins/{plugin.Manifest.Id}{ep.Path}"

                apis.Add(
                    { Id = $"{plugin.Manifest.Id}:{ep.Method}:{ep.Path}"
                      PluginId = plugin.Manifest.Id
                      Method = ep.Method
                      Path = fullPath
                      Description = ep.Description
                      Tags = ep.Tags }
                )

            // Register built-in store APIs for this plugin
            let pid = plugin.Manifest.Id

            for method, path, desc in
                [ "GET", $"/api/plugins/{pid}/_store", "List store items"
                  "GET", $"/api/plugins/{pid}/_store/{{key}}", "Get store item"
                  "PUT", $"/api/plugins/{pid}/_store/{{key}}", "Set store item"
                  "DELETE", $"/api/plugins/{pid}/_store/{{key}}", "Delete store item" ] do
                apis.Add(
                    { Id = $"{pid}:store:{method}:{path}"
                      PluginId = pid
                      Method = method
                      Path = path
                      Description = desc
                      Tags = [ "store"; "built-in" ] }
                ))

    member _.Unregister(pluginId: string) =
        plugins.TryRemove(pluginId) |> ignore

        lock apisLock (fun () ->
            apis.RemoveAll(fun a -> a.PluginId = pluginId) |> ignore)

    member _.GetPlugins() =
        plugins.Values |> Seq.toList

    member _.GetPlugin(id) =
        match plugins.TryGetValue(id) with
        | true, p -> Some p
        | _ -> None

    member _.GetApis() =
        lock apisLock (fun () -> apis |> Seq.toList)

    member _.GetApisByPlugin(pid) =
        lock apisLock (fun () -> apis |> Seq.filter (fun a -> a.PluginId = pid) |> Seq.toList)

    member _.GetApisByTags(tags: string list) =
        lock apisLock (fun () ->
            if tags.IsEmpty then
                apis |> Seq.toList
            else
                apis
                |> Seq.filter (fun a -> tags |> List.exists (fun t -> a.Tags |> List.contains t))
                |> Seq.toList)
