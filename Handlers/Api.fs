module Idpai.Handlers.Api

open System
open System.IO
open System.Text.Json
open System.Threading.Tasks
open Microsoft.AspNetCore.Builder
open Microsoft.AspNetCore.Http
open Microsoft.AspNetCore.Routing
open Idpai.Store
open Idpai.Plugins
open Idpai.Pages

let mapRoutes
    (app: WebApplication)
    (registry: PluginRegistry)
    (store: IDataStore)
    (eventBus: IEventBus)
    (pluginsDir: string)
    (nodeId: string)
    (http: System.Net.Http.HttpClient)
    (pages: PageConfig list)
    =

    // GET /api/metadata — returns all registered APIs with metadata
    app.MapGet(
        "/api/metadata",
        Func<HttpContext, IResult>(fun ctx ->
            let tagFilter =
                match ctx.Request.Query.TryGetValue("tags") with
                | true, v -> v.ToArray() |> Array.toList
                | _ -> []

            let apis =
                if tagFilter.IsEmpty then
                    registry.GetApis()
                else
                    registry.GetApisByTags(tagFilter)

            Results.Ok(
                {| apis = apis
                   total = apis.Length
                   nodeId = nodeId |}
            ))
    )
    |> ignore

    // GET /api/plugins — list loaded plugins
    app.MapGet(
        "/api/plugins",
        Func<IResult>(fun () ->
            let ps =
                registry.GetPlugins()
                |> List.map (fun p ->
                    {| id = p.Manifest.Id
                       name = p.Manifest.Name
                       version = p.Manifest.Version
                       description = p.Manifest.Description
                       hasUi = p.Manifest.Ui.IsSome
                       hasBe = p.Manifest.Be.IsSome
                       widgets = p.Manifest.Widgets |> List.map (fun w -> {| id = w.Id; name = w.Name; entry = w.Entry |})
                       ui =
                        p.Manifest.Ui
                        |> Option.map (fun u ->
                            {| route = u.Route
                               nav = {| label = u.Nav.Label; icon = u.Nav.Icon |} |})
                       apis = registry.GetApisByPlugin(p.Manifest.Id) |})

            Results.Ok({| plugins = ps |}))
    )
    |> ignore

    // GET /api/plugins/{id}/ui/{**filePath} — serve plugin UI files
    app.MapGet(
        "/api/plugins/{id}/ui/{**filePath}",
        Func<HttpContext, IResult>(fun ctx ->
            let id = ctx.GetRouteValue("id") :?> string
            let filePath = ctx.GetRouteValue("filePath") :?> string

            match registry.GetPlugin(id) with
            | Some plugin ->
                let fp = Path.GetFullPath(Path.Combine(plugin.Directory, "ui", filePath))
                let baseDir = Path.GetFullPath(plugin.Directory)

                if fp.StartsWith(baseDir) && File.Exists(fp) then
                    let ct =
                        match Path.GetExtension(fp).ToLower() with
                        | ".js" -> "application/javascript"
                        | ".css" -> "text/css"
                        | ".html" -> "text/html"
                        | ".json" -> "application/json"
                        | ".vue" -> "text/plain"
                        | _ -> "application/octet-stream"

                    Results.File(File.ReadAllBytes(fp), contentType = ct)
                else
                    Results.NotFound()
            | None -> Results.NotFound())
    )
    |> ignore

    // GET /api/plugins/{id}/widgets/{**filePath} — serve plugin widget files
    app.MapGet(
        "/api/plugins/{id}/widgets/{**filePath}",
        Func<HttpContext, IResult>(fun ctx ->
            let id = ctx.GetRouteValue("id") :?> string
            let filePath = ctx.GetRouteValue("filePath") :?> string

            match registry.GetPlugin(id) with
            | Some plugin ->
                let fp = Path.GetFullPath(Path.Combine(plugin.Directory, "widgets", filePath))
                let baseDir = Path.GetFullPath(plugin.Directory)

                if fp.StartsWith(baseDir) && File.Exists(fp) then
                    let ct =
                        match Path.GetExtension(fp).ToLower() with
                        | ".js" -> "application/javascript"
                        | ".vue" -> "text/plain"
                        | _ -> "application/octet-stream"

                    Results.File(File.ReadAllBytes(fp), contentType = ct)
                else
                    Results.NotFound()
            | None -> Results.NotFound())
    )
    |> ignore

    // GET /api/pages — list all YAML-defined pages
    app.MapGet(
        "/api/pages",
        Func<IResult>(fun () ->
            let dtos =
                pages |> List.map (fun p ->
                    {| id      = p.Id
                       title   = p.Title
                       route   = p.Route
                       columns = p.Columns
                       widgets =
                           p.Widgets |> List.map (fun w ->
                               {| plugin = w.Plugin
                                  widget = w.Widget
                                  size   = w.Size
                                  bare   = w.Bare
                                  ``params`` = w.Params |}) |})
            Results.Ok({| pages = dtos |}))
    )
    |> ignore

    // GET /api/health — instance health + cluster info
    app.MapGet(
        "/api/health",
        Func<IResult>(fun () ->
            Results.Ok(
                {| status = "healthy"
                   nodeId = nodeId
                   timestamp = DateTimeOffset.UtcNow
                   plugins = registry.GetPlugins().Length
                   apis = registry.GetApis().Length |}
            ))
    )
    |> ignore

    // GET /api/events/stream — SSE endpoint for browser event subscription
    app.MapGet(
        "/api/events/stream",
        Func<HttpContext, Task>(fun ctx ->
            task {
                ctx.Response.ContentType <- "text/event-stream"
                ctx.Response.Headers.Append("Cache-Control", "no-cache")
                ctx.Response.Headers.Append("Connection", "keep-alive")

                let topics =
                    match ctx.Request.Query.TryGetValue("topics") with
                    | true, v -> v.ToArray() |> Array.toList
                    | _ -> [ "*" ]

                let ch = eventBus.Subscribe(topics)

                try
                    while not ctx.RequestAborted.IsCancellationRequested do
                        let! evt = ch.Reader.ReadAsync(ctx.RequestAborted).AsTask()

                        let json =
                            JsonSerializer.Serialize(
                                {| id = evt.Id
                                   topic = evt.Topic
                                   payload = evt.Payload
                                   timestamp = evt.Timestamp |}
                            )

                        do! ctx.Response.WriteAsync($"data: {json}\n\n", ctx.RequestAborted)
                        do! ctx.Response.Body.FlushAsync(ctx.RequestAborted)
                with
                | _ -> ()

                eventBus.Unsubscribe(ch)
            }
            :> Task)
    )
    |> ignore

    // POST /api/events/publish — publish events from REST
    app.MapPost(
        "/api/events/publish",
        Func<HttpContext, Task<IResult>>(fun ctx ->
            task {
                use reader = new StreamReader(ctx.Request.Body)
                let! body = reader.ReadToEndAsync()
                use doc = JsonDocument.Parse(body)
                let root = doc.RootElement

                let topic =
                    match root.TryGetProperty("topic") with
                    | true, v -> v.GetString()
                    | _ -> "default"

                let payload =
                    match root.TryGetProperty("payload") with
                    | true, v -> v.GetRawText()
                    | _ -> "{}"

                let id = eventBus.Publish(topic, payload, Map.empty)
                return Results.Ok({| eventId = id |})
            })
    )
    |> ignore

    // Built-in store API — available to all plugins without configuration
    // GET /api/plugins/{pluginId}/_store?prefix=...
    app.MapGet(
        "/api/plugins/{pluginId}/_store",
        Func<HttpContext, Task<IResult>>(fun ctx ->
            task {
                let pid = ctx.GetRouteValue("pluginId") :?> string

                let prefix =
                    match ctx.Request.Query.TryGetValue("prefix") with
                    | true, v -> v.ToString()
                    | _ -> ""

                let! items, total = store.List(pid, prefix, 0) |> Async.StartAsTask
                return Results.Ok({| items = items; total = total |})
            })
    )
    |> ignore

    // GET /api/plugins/{pluginId}/_store/{key}
    app.MapGet(
        "/api/plugins/{pluginId}/_store/{key}",
        Func<HttpContext, Task<IResult>>(fun ctx ->
            task {
                let pid = ctx.GetRouteValue("pluginId") :?> string
                let key = ctx.GetRouteValue("key") :?> string
                let! v = store.Get(pid, key) |> Async.StartAsTask

                match v with
                | Some s -> return Results.Content(s, "application/json")
                | None -> return Results.NotFound()
            })
    )
    |> ignore

    // PUT /api/plugins/{pluginId}/_store/{key}
    app.MapPut(
        "/api/plugins/{pluginId}/_store/{key}",
        Func<HttpContext, Task<IResult>>(fun ctx ->
            task {
                let pid = ctx.GetRouteValue("pluginId") :?> string
                let key = ctx.GetRouteValue("key") :?> string
                use reader = new StreamReader(ctx.Request.Body)
                let! body = reader.ReadToEndAsync()
                do! store.Set(pid, key, body, 0L) |> Async.StartAsTask
                return Results.Ok({| key = key |})
            })
    )
    |> ignore

    // DELETE /api/plugins/{pluginId}/_store/{key}
    app.MapDelete(
        "/api/plugins/{pluginId}/_store/{key}",
        Func<HttpContext, Task<IResult>>(fun ctx ->
            task {
                let pid = ctx.GetRouteValue("pluginId") :?> string
                let key = ctx.GetRouteValue("key") :?> string
                let! ok = store.Delete(pid, key) |> Async.StartAsTask

                if ok then
                    return Results.NoContent()
                else
                    return Results.NotFound()
            })
    )
    |> ignore

    // Dynamic plugin routes from declarative handlers (handlers.json)
    for plugin in registry.GetPlugins() do
        let pid = plugin.Manifest.Id

        for ep in plugin.Endpoints do
            let routePath = $"/api/plugins/{pid}{ep.Path}"

            match ep.Method.ToUpperInvariant(), ep.Operation.Type with
            | "GET", "fetch" ->
                app.MapGet(
                    routePath,
                    Func<Task<IResult>>(fun () ->
                        task {
                            try
                                use req = new System.Net.Http.HttpRequestMessage(System.Net.Http.HttpMethod.Get, ep.Operation.Url)
                                req.Headers.TryAddWithoutValidation("User-Agent", "Mozilla/5.0 (compatible; idpai/1.0)") |> ignore
                                let! resp = http.SendAsync(req)
                                let! body = resp.Content.ReadAsStringAsync()
                                let ct =
                                    if resp.Content.Headers.ContentType <> null
                                    then resp.Content.Headers.ContentType.MediaType
                                    else "application/json"
                                return Results.Content(body, ct)
                            with ex ->
                                return Results.Problem(ex.Message)
                        })
                )
                |> ignore
            | "GET", "readFile" ->
                let baseDir =
                    if Path.IsPathRooted(ep.Operation.Dir) then ep.Operation.Dir
                    else Path.GetFullPath(Path.Combine(plugin.Directory, ep.Operation.Dir))
                app.MapGet(
                    routePath,
                    Func<HttpContext, IResult>(fun ctx ->
                        let file =
                            match ctx.Request.Query.TryGetValue("file") with
                            | true, v -> v.ToString()
                            | _ -> ""
                        if file = "" then
                            Results.BadRequest("Missing ?file= parameter")
                        else
                            let fp = Path.GetFullPath(Path.Combine(baseDir, file))
                            if not (fp.StartsWith(baseDir)) then
                                Results.BadRequest("Invalid file path")
                            elif not (File.Exists(fp)) then
                                Results.NotFound()
                            else
                                Results.Content(File.ReadAllText(fp), "text/plain; charset=utf-8"))
                )
                |> ignore
            | "GET", "list" ->
                app.MapGet(
                    routePath,
                    Func<HttpContext, Task<IResult>>(fun _ctx ->
                        task {
                            let! items, total = store.List(pid, ep.Operation.Prefix, 0) |> Async.StartAsTask
                            return Results.Ok({| items = items; total = total |})
                        })
                )
                |> ignore
            | "GET", "get" ->
                app.MapGet(
                    routePath,
                    Func<HttpContext, Task<IResult>>(fun ctx ->
                        task {
                            let id = ctx.GetRouteValue("id") :?> string
                            let! v = store.Get(pid, ep.Operation.KeyPrefix + id) |> Async.StartAsTask

                            match v with
                            | Some s -> return Results.Content(s, "application/json")
                            | None -> return Results.NotFound()
                        })
                )
                |> ignore
            | "POST", "set" ->
                app.MapPost(
                    routePath,
                    Func<HttpContext, Task<IResult>>(fun ctx ->
                        task {
                            use reader = new StreamReader(ctx.Request.Body)
                            let! body = reader.ReadToEndAsync()

                            let key =
                                try
                                    use d = JsonDocument.Parse(body)

                                    match d.RootElement.TryGetProperty("id") with
                                    | true, v -> v.GetString()
                                    | _ -> Guid.NewGuid().ToString("N")
                                with
                                | _ -> Guid.NewGuid().ToString("N")

                            do! store.Set(pid, ep.Operation.KeyPrefix + key, body, 0L) |> Async.StartAsTask

                            return
                                Results.Created($"/api/plugins/{pid}{ep.Path}/{key}", {| id = key |})
                        })
                )
                |> ignore
            | "DELETE", "delete" ->
                app.MapDelete(
                    routePath,
                    Func<HttpContext, Task<IResult>>(fun ctx ->
                        task {
                            let id = ctx.GetRouteValue("id") :?> string
                            let! ok = store.Delete(pid, ep.Operation.KeyPrefix + id) |> Async.StartAsTask

                            if ok then
                                return Results.NoContent()
                            else
                                return Results.NotFound()
                        })
                )
                |> ignore
            | _ -> ()
