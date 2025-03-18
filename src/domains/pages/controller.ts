import { Controller } from "@nestjs/common";
import { PagesService } from "./service";

@Controller()
export class PagesController {
    constructor(private service: PagesService) {}
}