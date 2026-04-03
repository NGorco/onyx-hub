namespace Idpai.Services

open System
open System.Threading.Tasks
open Grpc.Core
open Idpai.Grpc
open Idpai.Store

type EventsGrpcService(eventBus: IEventBus) =
    inherit Events.EventsBase()

    override _.Publish(req: PublishRequest, _ctx: ServerCallContext) =
        task {
            let headers =
                req.Headers |> Seq.map (fun kv -> kv.Key, kv.Value) |> Map.ofSeq

            let id = eventBus.Publish(req.Topic, req.Payload, headers)
            return PublishResponse(EventId = id)
        }

    override _.Subscribe
        (req: SubscribeRequest, stream: IServerStreamWriter<EventMessage>, ctx: ServerCallContext)
        =
        task {
            let ch = eventBus.Subscribe(req.Topics |> Seq.toList)

            try
                while not ctx.CancellationToken.IsCancellationRequested do
                    let! evt = ch.Reader.ReadAsync(ctx.CancellationToken).AsTask()

                    let msg =
                        EventMessage(
                            Id = evt.Id,
                            Topic = evt.Topic,
                            Payload = evt.Payload,
                            Timestamp = evt.Timestamp
                        )

                    for kv in evt.Headers do
                        msg.Headers.Add(kv.Key, kv.Value)

                    do! stream.WriteAsync(msg)
            with
            | :? TaskCanceledException -> ()
            | :? OperationCanceledException -> ()

            eventBus.Unsubscribe(ch)
        }
        :> Task
