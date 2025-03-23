import { Module } from "@nestjs/common";
import { ComponentsAPIController } from "./controller";
import { ApiActionsConfig } from "./api_actions_config";

export const APIActionsSymbol = Symbol('APIActions');

@Module({
    providers: [
        ApiActionsConfig
    ],
    controllers: [ComponentsAPIController]
})
export class ComponentsAPIModule { }