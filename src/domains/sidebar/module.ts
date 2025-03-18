import { Module } from "@nestjs/common";
import { SidebarControler } from "./controller";
import { SidebarService } from "./service";

@Module({
    controllers: [SidebarControler],
    providers: [SidebarService]
})
export class SidebarModule {}