namespace Idpai.Services

open System.Threading.Tasks
open Grpc.Core
open Idpai.Grpc
open Idpai.Store

type DataStoreGrpcService(store: IDataStore) =
    inherit DataStore.DataStoreBase()

    override _.Get(req: GetRequest, _ctx: ServerCallContext) =
        task {
            let! v = store.Get(req.Scope, req.Key) |> Async.StartAsTask
            let r = GetResponse()

            match v with
            | Some s ->
                r.Value <- s
                r.Found <- true
            | None -> r.Found <- false

            return r
        }

    override _.Set(req: SetRequest, _ctx: ServerCallContext) =
        task {
            do! store.Set(req.Scope, req.Key, req.Value, req.TtlSeconds) |> Async.StartAsTask
            return SetResponse(Success = true)
        }

    override _.Delete(req: DeleteRequest, _ctx: ServerCallContext) =
        task {
            let! ok = store.Delete(req.Scope, req.Key) |> Async.StartAsTask
            return DeleteResponse(Deleted = ok)
        }

    override _.List(req: ListRequest, _ctx: ServerCallContext) =
        task {
            let! items, total = store.List(req.Scope, req.Prefix, req.Limit) |> Async.StartAsTask
            let r = ListResponse(Total = total)

            for i in items do
                r.Items.Add(ListItem(Key = i.Key, Value = i.Value))

            return r
        }

    override _.Watch(req: WatchRequest, stream: IServerStreamWriter<WatchEvent>, ctx: ServerCallContext) =
        task {
            try
                while not ctx.CancellationToken.IsCancellationRequested do
                    do! Task.Delay(5000, ctx.CancellationToken)
            with
            | :? TaskCanceledException -> ()
        }
        :> Task
