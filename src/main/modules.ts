import { Module } from "@nestjs/common";
import { RouterModule } from "@nestjs/core";
import { SidebarModule } from "../domains/sidebar/module";
import { UserModule } from "../domains/user/module";
import { SharedModule } from "../domains/shared/module";
import { PagesModule } from "../domains/pages/module";

@Module({
    imports: [
        SharedModule,
        UserModule,
        PagesModule,
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
export class OnyxAppModule{}