import { Body, Controller, Param, Post } from "@nestjs/common";
import { ApiActionsConfig } from "./api_actions_config";
import { OnyxPluginConfig, UserConfigClass } from "../../application/user_config";

export interface IComponentRequest {
    action: string
    data: Record<string, any>
}

@Controller()
export class ComponentsAPIController {
    constructor(private componentApiService: ApiActionsConfig, private userConfig: UserConfigClass) {

    }

    @Post('/:pluginId/:actionId')
    async handleComponentRequests(@Param('pluginId') pluginId: string, @Param('actionId') actionId: string, @Body() body: Record<string, any>) {
        try {
            const pluginConfigs: Map<string, OnyxPluginConfig> = new Map;
            [...this.userConfig.plugin_configs.values()].forEach(v => {
                if (v.onyx_data.plugin_id === pluginId) {
                    pluginConfigs.set(v.onyx_id, v as OnyxPluginConfig);
                }
            });

            const handler = this.componentApiService.componentsActions.get(pluginId);

            if (!handler) {
                throw new Error();
            }

            return handler({
                action: actionId,
                data: body
            }, pluginConfigs);
        } catch (error) {
            console.error(`Component action ${actionId} for plugin ${pluginId} wasn't found`);
            return { error: `Component action ${actionId} for plugin ${pluginId} wasn't found` }
        }
    }
}