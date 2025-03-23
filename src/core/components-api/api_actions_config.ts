import { Injectable } from "@nestjs/common";
import { OnyxPluginConfig, UserConfigClass } from "../../application/user_config";
import { IComponentRequest } from "./controller";

@Injectable()
export class ApiActionsConfig {
    componentsActions: Map<string, (request:IComponentRequest, pluginConfig: Map<string, OnyxPluginConfig>) => Promise<any>> = new Map

    constructor(private userConfig: UserConfigClass) {
        this.findAndRegisterPluginEndpoints();
    }

    async findAndRegisterPluginEndpoints() {
        [...this.userConfig.plugin_configs.values()].forEach(async p => {
            if (p.onyx_data.backend_entry_file && p.onyx_data.backend_entry_point) {
                const componentModule = await import(p.onyx_data.plugin_folder + '/' + p.onyx_data.backend_entry_file);

                if (!componentModule[p.onyx_data.backend_entry_point]) {
                    throw new Error(`Entry point for entry file ${p.onyx_data.backend_entry_file} is not found`);
                }

                this.componentsActions.set(p.onyx_data.plugin_id, componentModule[p.onyx_data.backend_entry_point]);
            }
        });
    }
}