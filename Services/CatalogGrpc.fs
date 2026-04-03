namespace Idpai.Services

open System
open Grpc.Core
open Idpai.Grpc
open Idpai.Plugins

type CatalogGrpcService(registry: PluginRegistry) =
    inherit Catalog.CatalogBase()

    override _.GetApis(req: GetApisRequest, _ctx: ServerCallContext) =
        task {
            let apis =
                if String.IsNullOrEmpty(req.PluginId) && req.Tags.Count = 0 then
                    registry.GetApis()
                elif not (String.IsNullOrEmpty(req.PluginId)) then
                    registry.GetApisByPlugin(req.PluginId)
                else
                    registry.GetApisByTags(req.Tags |> Seq.toList)

            let r = GetApisResponse()

            for a in apis do
                let spec =
                    ApiSpec(
                        Id = a.Id,
                        PluginId = a.PluginId,
                        Method = a.Method,
                        Path = a.Path,
                        Description = a.Description
                    )

                spec.Tags.AddRange(a.Tags)
                r.Apis.Add(spec)

            return r
        }

    override _.RegisterApi(_req: RegisterApiRequest, _ctx: ServerCallContext) =
        task { return RegisterApiResponse(Success = false) }

    override _.GetPlugins(_req: GetPluginsRequest, _ctx: ServerCallContext) =
        task {
            let r = GetPluginsResponse()

            for p in registry.GetPlugins() do
                r.Plugins.Add(
                    PluginInfo(
                        Id = p.Manifest.Id,
                        Name = p.Manifest.Name,
                        Version = p.Manifest.Version,
                        Description = p.Manifest.Description,
                        HasUi = p.Manifest.Ui.IsSome,
                        HasBe = p.Manifest.Be.IsSome,
                        Status = "active"
                    )
                )

            return r
        }
