import { Module } from "@nestjs/common";
import { RouterModule } from "@nestjs/core";
import { SidebarModule } from "../core/sidebar/module";
import { UserModule } from "../core/user/module";
import { SharedModule } from "../core/shared/module";
import { PagesModule } from "../core/pages/module";
import { ComponentsAPIModule } from "../core/components-api/module";

@Module({
    imports: [
        SharedModule,
        UserModule,
        PagesModule,
        ComponentsAPIModule,
        RouterModule.register([
            {
                path: 'api',
                children: [
                    {
                        path: 'users',
                        module: UserModule
                    },
                    {
                        path: 'sidebar',
                        module: SidebarModule
                    },
                    {
                        path: 'components',
                        module: ComponentsAPIModule
                    }
                ]
            },
            {
                path: '/',
                module: PagesModule
            }
        ])
    ]
})
export class OnyxAppModule { }