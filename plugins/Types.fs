namespace Idpai.Plugins

type NavConfig = { Label: string; Icon: string }

type UiConfig =
    { Entry: string
      Route: string
      Nav: NavConfig }

type OperationConfig =
    { Type: string
      Prefix: string
      KeyPrefix: string
      KeyFrom: string
      Url: string
      Dir: string }

type EndpointConfig =
    { Method: string
      Path: string
      Description: string
      Tags: string list
      Operation: OperationConfig }

type BeConfig = { Endpoints: EndpointConfig list }

type WidgetConfig =
    { Id: string
      Name: string
      Entry: string }

type PluginManifest =
    { Id: string
      Name: string
      Version: string
      Description: string
      Widgets: WidgetConfig list
      Ui: UiConfig option
      Be: BeConfig option }

type LoadedPlugin =
    { Manifest: PluginManifest
      Directory: string
      Endpoints: EndpointConfig list }

type ApiEntry =
    { Id: string
      PluginId: string
      Method: string
      Path: string
      Description: string
      Tags: string list }
