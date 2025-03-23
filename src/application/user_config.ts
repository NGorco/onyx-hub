import { Injectable } from "@nestjs/common";
import type { ConfigClass } from "./config";
import { readdirSync, readFileSync } from "fs";
import { basename, dirname, extname, join } from "path";
// Somehow did not work as import
const yaml = require('js-yaml')

type OnyxResource = {
    onyx_type: ValueOf<typeof OnyxTypes>
    onyx_id: string
    onyx_data: Record<string, any>
}

type OnyxPage = OnyxResource & {
    onyx_data: Record<string, any> & {
        url: string
        guid: string
        parents: OnyxPage[]
        template?: string
    }
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
    CONFIG: 'config'
} as const

@Injectable()
export class UserConfigClass {
    pages: Map<string, OnyxPage> = new Map
    configs: Map<string, OnyxResource> = new Map
    plugin_configs: Map<string, OnyxResource> = new Map

    constructor(private config: ConfigClass) {
        const yamls = this.parseYamls();

        this.registerPageResources(yamls.pages, []);
        this.registerConfigResources(yamls.configs);
        this.registerPluginConfigs(yamls.plugin_configs, yamls.plugin_configs_files);

        //console.log([...this.pages.values()])
    }

    parseYamls() {
        const yamls: {
            configs: OnyxResource[],
            pages: OnyxResource[],
            plugin_configs: OnyxResource[],
            plugin_configs_files: Map<OnyxResource, string>
        } = {
            configs: [],
            pages: [],
            plugin_configs: [],
            plugin_configs_files: new Map
        }

        /** 
         * Sorting main config yamls
         */
        const configYamls = getAllYamlFiles(this.config.APP_FOLDER + '/src/config');

        for (let yamlPath of configYamls) {
            const fileContent = readFileSync(yamlPath, 'utf8');
            const data = yaml.load(fileContent);
            try {
                (Array.isArray(data) ? data : [data])
                    .map((d) => this.filterOnyxResource(d))
                    .filter(d => !!d)
                    .map(d => {
                        if (d.onyx_type === OnyxTypes.PAGE) {
                            yamls.pages.push(d);
                        }
                        return d;
                    })
                    .map(d => {
                        if (d.onyx_type === OnyxTypes.CONFIG) {
                            yamls.configs.push(d);
                        }
                    });
            } catch (error) {
                if (error instanceof Error) {
                    const err = new Error("Parsing config " + yamlPath + " failed: " + error.message);
                    throw err;
                }
            }
        }

        /** 
         * Parsing plugins yamls
         */
        const pluginsYamls = getAllYamlFiles(this.config.APP_FOLDER + '/src/plugins');

        for (let yamlPath of pluginsYamls) {
            const fileContent = readFileSync(yamlPath, 'utf8');
            const data = yaml.load(fileContent);
            try {
                (Array.isArray(data) ? data : [data])
                    .map((d) => this.filterOnyxResource(d))
                    .filter(d => !!d)
                    .map(d => {
                        if (d.onyx_type === OnyxTypes.PAGE) {
                            yamls.pages.push(d);
                        }
                        return d;
                    })
                    .map(d => {
                        if (d.onyx_type === OnyxTypes.CONFIG) {
                            yamls.plugin_configs_files.set(d, yamlPath);
                            yamls.plugin_configs.push(d)
                        }
                    });
            } catch (error) {
                if (error instanceof Error) {
                    const err = new Error("Parsing plugins " + yamlPath + " failed");
                    throw err;
                }
            }
        }

        return yamls
    }

    registerPageResources(pages: OnyxResource[], parent_pages: OnyxPage[]) {
        for (let page of pages) {
            if (page.onyx_type === OnyxTypes.PAGE) {
                if (this.pages.has(page.onyx_id)) {
                    throw new Error("Page already exists: " + page.onyx_id);
                }

                const onyxPage: OnyxPage = {
                    ...page,
                    onyx_data: {
                        ...page.onyx_data,
                        url: '',
                        guid: page.onyx_data.guid || page.onyx_id,
                        parents: parent_pages
                    },
                };
                onyxPage.onyx_data.url = [...parent_pages, onyxPage].map(p => p.onyx_data.guid).join('/');

                if (page.onyx_data.children && Array.isArray(page.onyx_data.children)) {
                    page.onyx_data.children.forEach(this.filterOnyxResource);
                    this.registerPageResources(page.onyx_data.children, [...parent_pages, onyxPage]);
                }

                this.pages.set(page.onyx_id, onyxPage);
            }
        }
    }

    mapConfigEnvVars(res: OnyxResource): OnyxResource {
        if (res.onyx_data.variables_from_env) {
            for (let [key, val] of Object.entries(res.onyx_data.variables_from_env)) {
                if (!Object.keys(process.env).includes(key)) {
                    throw new Error(`EnvVariable for variable '${key}' is absent: ` + val);
                }

                if (res.onyx_data.variables && res.onyx_data.variables[key]) {
                    throw new Error("Duplicated variable: " + key);
                }
                res.onyx_data.variables_from_env.key = process.env[val as string];
            }
        }

        if (res.onyx_data.secrets_from_env) {
            for (let [key, val] of Object.entries(res.onyx_data.secrets_from_env)) {
                if (!Object.keys(process.env).includes(key)) {
                    throw new Error(`EnvVariable for secret '${key}' is absent: ` + val);
                }
                if (res.onyx_data.secrets && res.onyx_data.secrets[key]) {
                    throw new Error("Duplicated secret: " + key);
                }
                res.onyx_data.secrets_from_env.key = process.env[val as string];
            }
        }

        return res;
    }

    registerConfigResources(configs: OnyxResource[]) {
        for (let config of configs) {
            config = this.mapConfigEnvVars(config);
            if (this.configs.has(config.onyx_id)) {
                throw new Error("Config already exists: " + config.onyx_id);
            }

            this.configs.set(config.onyx_id, config);
        }
    }

    registerPluginConfigs(configs: OnyxResource[], filePaths: Map<OnyxResource, string>) {
        for (let config of configs) {
            const filePath = filePaths.get(config);
            if (!filePath) {
                throw new Error("There is no path for config: " + JSON.stringify(config));
            }

            config = this.mapConfigEnvVars(config);

            if (!(new RegExp('^' + basename(dirname(filePath)) + '-.*')).test(config.onyx_id)) {
                throw new Error("Plugin Config Id should have the same prefix as `<plugin folder>-.*`: " + config.onyx_id);
            }

            if (this.plugin_configs.has(config.onyx_id)) {
                throw new Error("Plugin Config already exists: " + config.onyx_id);
            }

            this.plugin_configs.set(config.onyx_id, config);
        }
    }

    filterOnyxResource(res: OnyxResource): OnyxResource | null {
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