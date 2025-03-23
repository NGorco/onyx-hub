import fetch from "cross-fetch";
import { OnyxPluginConfig } from "../../../application/user_config";
import { IComponentRequest } from "../../../core/components-api/controller";

const handlers: Record<string, (data: Record<string, any>, pluginConfigs: Map<string, OnyxPluginConfig>) => Promise<any>> = {
    get_repos: async (data, pluginConfigs) => {
      const config = pluginConfigs.get('github-repo-plugin-config');
      if (!config) {
        throw new Error();
      }
  
      const url = new URL(`https://api.github.com/orgs/${config.onyx_data.secrets_from_env.org_id}/repos`);
      url.searchParams.set('per_page', '30');
      
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${config.onyx_data.secrets_from_env.auth_token}`,
          Accept: 'application/vnd.github+json'
        }
      });
  
      if (!res.ok) {
        throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
      }
  
      const rt = await res.json();
      return rt;
    }
  };
  
  export async function main(request: IComponentRequest, pluginConfigs: Map<string, OnyxPluginConfig>): Promise<any> {
    const handler = handlers[request.action];
    if (!handler) {
      throw new Error(`Unsupported action: ${request.action}`);
    }
  
    return handler(request.data, pluginConfigs);
  }