import { Module } from "@nestjs/common";
import { PagesController } from "./controller";
import { PagesService } from "./service";

@Module({
    controllers: [PagesController],
    providers: [PagesService]
})
export class PagesModule {}