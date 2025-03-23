import { Injectable } from "@nestjs/common";
import type { ConfigClass } from "./config";
import { readdirSync, readFileSync } from "fs";
import { basename, dirname, extname, join } from "path";

const yaml = require('js-yaml')

type OnyxResource = {
    onyx_type: ValueOf<typeof OnyxTypes>
    onyx_id: string
    onyx_data: Record<string, any>
}

function getAllYamlFiles(dir: string): string[] {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files = entries.flatMap(entry => {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            return getAllYamlFiles(fullPath);
        }
        const ext = extname(entry.name).toLowerCase();
        return ext === '.yaml' || ext === '.yml' ? [fullPath] : [];
    });
    return files;
}

const OnyxTypes = {
    PAGE: 'page',
    PLUGIN: 'plugin',
    CONFIG: 'config'
} as const


@Injectable()
export class UserConfigClass {
    pages: Map<string, OnyxResource> = new Map
    configs: Map<string, OnyxResource> = new Map
    plugins: Map<string, OnyxResource> = new Map

    constructor(private config: ConfigClass) {
        this.parseYamls();

        console.log(this.configs);
        console.log(this.plugins);
        console.log(this.pages);
    }

    parseYamls() {
        const configYamls = getAllYamlFiles(this.config.APP_FOLDER + '/src/config');

        for (let yamlPath of configYamls) {
            const fileContent = readFileSync(yamlPath, 'utf8');
            const data = yaml.load(fileContent);
            try {
                (Array.isArray(data) ? data : [data])
                .map((d) => this.filterMapOnyxResource(d))
                .filter(d => !!d)
                .map(d => this.registerPageResource(d))
                .map(d => this.mapConfigEnvVars(d))
                .map(d => this.registerConfigResource(d))
            } catch (error) {
                if (error instanceof Error) {
                    const err = new Error("Parsing config " + yamlPath + " failed: " + error.message);
                    throw err;
                }
            }
        }

        const pluginsYamls = getAllYamlFiles(this.config.APP_FOLDER + '/src/plugins');

        for (let yamlPath of pluginsYamls) {
            const fileContent = readFileSync(yamlPath, 'utf8');
            const data = yaml.load(fileContent);
            try {
                (Array.isArray(data) ? data : [data])
                .map((d) => this.filterMapOnyxResource(d))
                .filter(d => !!d)
                .map(d => this.validatePluginConfigs(d, yamlPath))
                .map(d => this.registerPageResource(d))
                .map(d => this.mapConfigEnvVars(d))
                .map(d => this.registerConfigResource(d))
            } catch (error) {
                if (error instanceof Error) {
                    const err = new Error("Parsing plugins " + yamlPath + " failed: " + error.message);
                    throw err;
                }
            }
        }
    }

    registerPageResource(res: OnyxResource): OnyxResource {
        if (res.onyx_type === OnyxTypes.PAGE) {
            if (this.pages.has(res.onyx_id)) {
                throw new Error("Page already exists: " + res.onyx_id);
            }

            this.pages.set(res.onyx_id, res);
        }

        return res;
    }

    mapConfigEnvVars(res: OnyxResource): OnyxResource {
        if (res.onyx_type === OnyxTypes.CONFIG) {
            if (res.onyx_data.variables_from_env) {
                for (let [key, val] of Object.entries(res.onyx_data.variables_from_env)) {
                    if (!Object.keys(process.env).includes(key)) {
                        throw new Error("Variable from Env is absent: " + key);
                    }
                    res.onyx_data.variables_from_env.key = process.env[val as string];
                }
            }

            if (res.onyx_data.secrets_from_env) {
                for (let [key, val] of Object.entries(res.onyx_data.secrets_from_env)) {
                    if (!Object.keys(process.env).includes(key)) {
                        throw new Error("Variable from Env is absent: " + key);
                    }
                    res.onyx_data.secrets_from_env.key = process.env[val as string];
                }
            }
        }

        return res;
    }

    registerConfigResource(res: OnyxResource): OnyxResource {
        if (res.onyx_type === OnyxTypes.CONFIG) {
            if (this.configs.has(res.onyx_id)) {
                throw new Error("Config already exists: " + res.onyx_id);
            }

            this.configs.set(res.onyx_id, res);
        }
        return res;
    }

    validatePluginConfigs(res: OnyxResource, filePath: string): OnyxResource {
        if (res.onyx_type === OnyxTypes.CONFIG) {
            if (!(new RegExp('^' + basename(dirname(filePath)) + '-.*')).test(res.onyx_id)) {
                throw new Error("Plugin Config Id should have the same prefix as a plugin folder: " + res.onyx_id);
            }
        }

        return res;
    }

    filterMapOnyxResource(res: OnyxResource): OnyxResource | null {
        if (!res.onyx_type) {
            return null
        }

        if (res.onyx_type && Object.values(OnyxTypes).includes(res.onyx_type)) {
            if (!res.onyx_id || !res.onyx_data) {
                throw new Error(("Onyx Id or Onyx Data is absent for resource: " + JSON.stringify(res)))
            }
        }

        return res;
    }
}