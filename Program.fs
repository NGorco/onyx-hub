open System
open System.IO
open System.Net.Http
open System.Text
open System.Text.Json
open System.Threading
open Microsoft.AspNetCore.Builder
open Microsoft.AspNetCore.Hosting
open Microsoft.AspNetCore.Http
open Microsoft.AspNetCore.Server.Kestrel.Core
open Microsoft.Extensions.DependencyInjection
open Idpai.Store
open Idpai.Plugins
open Idpai.Pages
open Idpai.Services

[<EntryPoint>]
let main args =
    let builder = WebApplication.CreateBuilder(args)

    let pluginsDir =
        Environment.GetEnvironmentVariable("PLUGINS_DIR")
        |> Option.ofObj
        |> Option.defaultValue (Path.Combine(Directory.GetCurrentDirectory(), "plugins"))

    let nodeId =
        Environment.GetEnvironmentVariable("NODE_ID")
        |> Option.ofObj
        |> Option.defaultValue Environment.MachineName

    let nodeName =
        Environment.GetEnvironmentVariable("NODE_NAME")
        |> Option.ofObj
        |> Option.defaultValue nodeId

    let seedRegistryUrl =
        Environment.GetEnvironmentVariable("SEED_REGISTRY_URL")
        |> Option.ofObj
        |> Option.map (fun s -> s.TrimEnd '/')

    let port =
        Environment.GetEnvironmentVariable "PORT"
        |> Option.ofObj
        |> Option.bind (fun s -> match System.Int32.TryParse s with true, v -> Some v | _ -> None)
        |> Option.defaultValue 8080

    // Configure Kestrel for both HTTP/1.1 (REST) and HTTP/2 (gRPC)
    builder.WebHost.ConfigureKestrel(fun opts ->
        opts.ListenAnyIP(port, fun lo -> lo.Protocols <- HttpProtocols.Http1AndHttp2))
    |> ignore

    builder.WebHost.UseShutdownTimeout(TimeSpan.FromSeconds 4.0) |> ignore

    // Services
    builder.Services.AddSingleton<IDataStore>(InMemoryStore() :> IDataStore)
    |> ignore

    builder.Services.AddSingleton<IEventBus>(InMemoryEventBus() :> IEventBus)
    |> ignore

    builder.Services.AddSingleton<PluginRegistry>() |> ignore
    builder.Services.AddGrpc() |> ignore

    builder.Services.AddCors(fun o ->
        o.AddDefaultPolicy(fun p ->
            p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader() |> ignore))
    |> ignore

    builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(fun (o: Microsoft.AspNetCore.Http.Json.JsonOptions) ->
        o.SerializerOptions.PropertyNamingPolicy <- JsonNamingPolicy.CamelCase)
    |> ignore

    let app = builder.Build()

    // Resolve services
    let registry = app.Services.GetRequiredService<PluginRegistry>()
    let store = app.Services.GetRequiredService<IDataStore>()
    let eventBus = app.Services.GetRequiredService<IEventBus>()

    // Load plugins
    Loader.loadPlugins pluginsDir registry
    printfn $"[portal] Node: {nodeName} | Plugins dir: {pluginsDir}"
    printfn $"[portal] Loaded {registry.GetPlugins().Length} plugin(s), {registry.GetApis().Length} API(s)"

    // Load pages
    let pagesDir =
        Environment.GetEnvironmentVariable("PAGES_DIR")
        |> Option.ofObj
        |> Option.defaultValue (Path.Combine(Directory.GetCurrentDirectory(), "pages"))
    let pages = Idpai.Pages.Loader.loadPages pagesDir
    printfn $"[pages] Loaded {pages.Length} page(s)"

    // Middleware
    app.UseCors() |> ignore
    app.UseDefaultFiles() |> ignore
    app.UseStaticFiles() |> ignore

    // SPA fallback — serve index.html for any non-API, non-file request
    app.MapFallback(fun (ctx: HttpContext) ->
        let path = ctx.Request.Path.Value
        if path.StartsWith("/api/") then
            ctx.Response.StatusCode <- 404
            System.Threading.Tasks.Task.CompletedTask
        else
            let indexPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "index.html")
            ctx.Response.ContentType <- "text/html"
            ctx.Response.SendFileAsync(indexPath))
    |> ignore

    // gRPC services
    app.MapGrpcService<DataStoreGrpcService>() |> ignore
    app.MapGrpcService<CatalogGrpcService>() |> ignore
    app.MapGrpcService<EventsGrpcService>() |> ignore

    let http = new HttpClient()

    // REST API routes
    Idpai.Handlers.Api.mapRoutes app registry store eventBus pluginsDir nodeName http pages

    // Cluster heartbeat — self-register and evict stale nodes
    let heartbeatIntervalSec = 15
    let missThreshold = 2
    let startedAt = DateTimeOffset.UtcNow
    let cts = new CancellationTokenSource()

    let storeKey = "node:" + nodeName
    let scope = "cluster-registry"

    // Writes node record to whichever registry this node targets
    let setNodeRecord (payload: string) = async {
        match seedRegistryUrl with
        | Some url ->
            let storeUrl = $"{url}/api/plugins/{scope}/_store/{storeKey}"
            use content = new StringContent(payload, Encoding.UTF8, "application/json")
            let! resp = http.PutAsync(storeUrl, content) |> Async.AwaitTask
            if resp.IsSuccessStatusCode then
                printfn $"[cluster] Heartbeat -> {storeUrl} OK"
            else
                eprintfn $"[cluster] Heartbeat -> {storeUrl} FAILED ({int resp.StatusCode} {resp.ReasonPhrase})"
        | None ->
            do! store.Set(scope, storeKey, payload, 0L)
    }

    let deleteNodeRecord () = async {
        match seedRegistryUrl with
        | Some url ->
            let storeUrl = $"{url}/api/plugins/{scope}/_store/{storeKey}"
            do! http.DeleteAsync storeUrl |> Async.AwaitTask |> Async.Ignore
        | None ->
            do! store.Delete(scope, storeKey) |> Async.Ignore
    }

    let heartbeatLoop = async {
        let staleMs = int64 (heartbeatIntervalSec * missThreshold) * 1000L

        match seedRegistryUrl with
        | Some url -> printfn $"[cluster] Node {nodeName} registering into seed registry at {url}"
        | None     -> printfn $"[cluster] Node {nodeName} registering in local cluster registry"

        while not cts.Token.IsCancellationRequested do
            try
                let now = DateTimeOffset.UtcNow
                let portalUrl =
                    Environment.GetEnvironmentVariable("PORTAL_URL")
                    |> Option.ofObj
                    |> Option.defaultValue $"http://localhost:{port}"

                let payload =
                    JsonSerializer.Serialize
                        {| nodeId = nodeId
                           nodeName = nodeName
                           portalUrl = portalUrl
                           lastHeartbeat = now
                           startedAt = startedAt
                           plugins = registry.GetPlugins().Length
                           apis = registry.GetApis().Length |}

                printfn $"[cluster] Heartbeat payload: {payload}"
                do! setNodeRecord payload

                match seedRegistryUrl with
                | Some url ->
                    // Pull full node list from seed and sync to local store
                    let listUrl = $"{url}/api/plugins/{scope}/_store?prefix=node:"
                    try
                        let! resp = http.GetAsync(listUrl) |> Async.AwaitTask
                        if resp.IsSuccessStatusCode then
                            let! body = resp.Content.ReadAsStringAsync() |> Async.AwaitTask
                            printfn $"[cluster] Node list from seed: {body}"
                            use doc = JsonDocument.Parse body
                            let items =
                                match doc.RootElement.TryGetProperty "items" with
                                | true, arr -> arr.EnumerateArray() |> Seq.toList
                                | _ -> []
                            for item in items do
                                let key =
                                    match item.TryGetProperty "key" with
                                    | true, k -> k.GetString()
                                    | _ -> ""
                                let value =
                                    match item.TryGetProperty "value" with
                                    | true, v -> v.GetString()
                                    | _ -> ""
                                if key <> "" && value <> "" then
                                    do! store.Set(scope, key, value, 0L)
                        else
                            eprintfn $"[cluster] Failed to fetch node list from seed ({int resp.StatusCode})"
                    with ex ->
                        eprintfn $"[cluster] Failed to fetch node list from seed: {ex.Message}"

                | None ->
                    // Eviction and event publishing only on the seed node
                    let! items, _ = store.List(scope, "node:", 0)
                    for item in items do
                        try
                            use doc = JsonDocument.Parse item.Value
                            let root = doc.RootElement
                            match root.TryGetProperty "lastHeartbeat" with
                            | true, v ->
                                let lastBeat = v.GetDateTimeOffset()
                                let elapsed = (now - lastBeat).TotalMilliseconds |> int64
                                if elapsed > staleMs then
                                    let staleName =
                                        match root.TryGetProperty "nodeName" with
                                        | true, nv -> nv.GetString()
                                        | _ -> ""
                                    if staleName <> "" then
                                        do! store.Delete(scope, "node:" + staleName) |> Async.Ignore
                                        printfn $"[cluster] Evicted stale node: {staleName} (last heartbeat {elapsed}ms ago)"
                                        eventBus.Publish("cluster.node.left", JsonSerializer.Serialize {| nodeName = staleName |}, Map.empty) |> ignore
                            | _ -> ()
                        with _ -> ()

                    let! activeItems, _ = store.List(scope, "node:", 0)
                    let nodeLabels =
                        activeItems |> List.map (fun i ->
                            try
                                use doc = JsonDocument.Parse i.Value
                                match doc.RootElement.TryGetProperty "nodeName" with
                                | true, v -> v.GetString()
                                | _ -> i.Key.Replace("node:", "")
                            with _ -> i.Key.Replace("node:", ""))
                    let nodeList = String.concat ", " nodeLabels
                    printfn $"[cluster] Heartbeat: {activeItems.Length} active node(s): {nodeList}"
                    eventBus.Publish("cluster.heartbeat", JsonSerializer.Serialize {| nodeName = nodeName; activeNodes = nodeLabels |}, Map.empty) |> ignore

                do! Async.Sleep (heartbeatIntervalSec * 1000)
            with ex ->
                if not cts.Token.IsCancellationRequested then
                    eprintfn $"[cluster] Heartbeat error: {ex.Message}"
                    do! Async.Sleep 5000
    }

    Async.Start(heartbeatLoop, cts.Token)

    app.Lifetime.ApplicationStopping.Register(fun () ->
        printfn $"[cluster] Node {nodeName} deregistering from cluster"
        cts.Cancel()
        let task = deleteNodeRecord () |> Async.StartAsTask
        if not (task.Wait(3000)) then
            eprintfn "[cluster] Deregister timed out"
        eventBus.Publish("cluster.node.left", JsonSerializer.Serialize {| nodeName = nodeName |}, Map.empty) |> ignore
    ) |> ignore

    printfn $"[portal] Listening on http://0.0.0.0:{port}"
    app.Run()
    0
