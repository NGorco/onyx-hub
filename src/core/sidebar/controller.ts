import { Controller, Inject } from "@nestjs/common";
import { SidebarService } from "./service";
import { GetSideBarOutput } from "./dto/sidebar.dto";

@Controller()
export class SidebarControler {

    constructor(private service: SidebarService) { }

    async getSideBar(): Promise<GetSideBarOutput> {
        return {
            sidebarElements: [
                { link: '', label: '' }
            ]
        }
    }
}