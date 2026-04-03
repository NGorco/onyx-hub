namespace Idpai.Pages

open System.Collections.Generic

// CLR-compatible classes required by YamlDotNet deserializer
// Mutable with parameterless constructors so the deserializer can populate them via reflection

type WidgetRefYaml() =
    member val Plugin = "" with get, set
    member val Widget = "" with get, set
    member val Size   = 1     with get, set
    member val Bare   = false with get, set
    member val Params = Dictionary<string, string>() with get, set

type PageYaml() =
    member val Id      = ""  with get, set
    member val Title   = ""  with get, set
    member val Route   = "/" with get, set
    member val Columns = 3   with get, set
    member val Widgets = List<WidgetRefYaml>() with get, set

// Immutable F# types used everywhere else

type WidgetRef =
    { Plugin : string
      Widget : string
      Size   : int
      Bare   : bool
      Params : Map<string, string> }

type PageConfig =
    { Id      : string
      Title   : string
      Route   : string
      Columns : int
      Widgets : WidgetRef list }
