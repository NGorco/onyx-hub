import { Module } from "@nestjs/common";
import { RouterModule } from "@nestjs/core";
import { SidebarModule } from "../domains/sidebar/module";
import { UserModule } from "../domains/user/module";
import { SharedModule } from "../domains/shared/module";

@Module({
    imports: [
        SharedModule,
        UserModule,
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
            }
        ])
    ]
})
export class OnyxAppModule{}