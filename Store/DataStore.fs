namespace Idpai.Store

open System
open System.Collections.Concurrent

type StoreItem = { Key: string; Value: string }

type IDataStore =
    abstract Get : scope: string * key: string -> Async<string option>
    abstract Set : scope: string * key: string * value: string * ttl: int64 -> Async<unit>
    abstract Delete : scope: string * key: string -> Async<bool>
    abstract List : scope: string * prefix: string * limit: int -> Async<StoreItem list * int>

type InMemoryStore() =
    let data = ConcurrentDictionary<string, string * DateTimeOffset option>()

    let fk scope key = $"{scope}:{key}"

    interface IDataStore with
        member _.Get(scope, key) =
            async {
                match data.TryGetValue(fk scope key) with
                | true, (_, Some exp) when exp < DateTimeOffset.UtcNow ->
                    data.TryRemove(fk scope key) |> ignore
                    return None
                | true, (v, _) -> return Some v
                | _ -> return None
            }

        member _.Set(scope, key, value, ttl) =
            async {
                let exp =
                    if ttl > 0L then
                        Some(DateTimeOffset.UtcNow.AddSeconds(float ttl))
                    else
                        None

                data[fk scope key] <- (value, exp)
            }

        member _.Delete(scope, key) =
            async {
                let ok, _ = data.TryRemove(fk scope key)
                return ok
            }

        member _.List(scope, prefix, limit) =
            async {
                let p = fk scope prefix
                let sLen = scope.Length + 1

                let items =
                    data
                    |> Seq.choose (fun kv ->
                        if kv.Key.StartsWith(p) then
                            match kv.Value with
                            | _, Some exp when exp < DateTimeOffset.UtcNow -> None
                            | (v, _) ->
                                Some
                                    { Key = kv.Key[sLen..]
                                      Value = v }
                        else
                            None)
                    |> Seq.toList

                let total = items.Length

                let result =
                    if limit > 0 then items |> List.truncate limit else items

                return (result, total)
            }
