namespace Idpai.Store

open System
open System.Threading.Channels

type EventData =
    { Id        : string
      Topic     : string
      Payload   : string
      Headers   : Map<string, string>
      Timestamp : int64 }

type IEventBus =
    abstract Publish     : topic: string * payload: string * headers: Map<string, string> -> string
    abstract Subscribe   : topics: string list -> Channel<EventData>
    abstract Unsubscribe : Channel<EventData> -> unit

type private BusMsg =
    | Publish     of EventData * AsyncReplyChannel<unit>
    | Subscribe   of string list * AsyncReplyChannel<Channel<EventData>>
    | Unsubscribe of Channel<EventData>

type InMemoryEventBus() =

    let agent = MailboxProcessor<BusMsg>.Start(fun inbox ->

        // Subscribers as an immutable list of (channel, topics) pairs.
        // Channel<T> is a reference type — (=) uses reference equality here.
        let rec loop (subs: (Channel<EventData> * string list) list) = async {
            let! msg = inbox.Receive()

            match msg with
            | Publish (evt, reply) ->
                subs |> List.iter (fun (ch, topics) ->
                    if topics |> List.exists (fun t -> t = "*" || t = evt.Topic || evt.Topic.StartsWith(t)) then
                        ch.Writer.TryWrite(evt) |> ignore)
                reply.Reply(())
                return! loop subs

            | Subscribe (topics, reply) ->
                let ch = Channel.CreateBounded<EventData>(256)
                reply.Reply(ch)
                return! loop ((ch, topics) :: subs)

            | Unsubscribe ch ->
                ch.Writer.TryComplete() |> ignore
                return! loop (subs |> List.filter (fun (c, _) -> c <> ch))
        }

        loop []
    )

    interface IEventBus with
        member _.Publish(topic, payload, headers) =
            let id = Guid.NewGuid().ToString("N")
            let evt =
                { Id        = id
                  Topic     = topic
                  Payload   = payload
                  Headers   = headers
                  Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() }
            agent.PostAndReply(fun reply -> Publish(evt, reply))
            id

        member _.Subscribe(topics) =
            agent.PostAndReply(fun reply -> Subscribe(topics, reply))

        member _.Unsubscribe(ch) =
            agent.Post(Unsubscribe ch)
