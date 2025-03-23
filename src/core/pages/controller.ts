import { Controller, Get, Inject, Req, Res } from "@nestjs/common";
import { PagesService } from "./service";
import { Request, Response } from "express";
import { ConfigClass } from "../../application/config";
import { UserConfigClass } from "../../application/user_config";
import { HandlebarsSymbol } from "../shared/module";
import { readFileSync } from "fs";

@Controller()
export class PagesController {
    constructor(private service: PagesService,
        private config: ConfigClass,
        private userConfig:UserConfigClass, 
        @Inject(HandlebarsSymbol) private hbs: typeof Handlebars.compile
    ) { }

    @Get('*')
    handleAll(@Req() req: Request, @Res() res: Response) {
        const path = req.path.replace(/^\/(.*)/g, '$1').replace(/(.*)\/$/g, '$1');

        let pages = [...this.userConfig.pages.values()].filter(p => p.onyx_data.url === path);

        if (path.startsWith('/api') || path.startsWith('/assets') || pages.length === 0) {
            return res.status(404).send('Not found');
        }

        const page = pages[0];

        const templatePath = page.onyx_data.template 
        || this.userConfig.configs.get('onyx_config')?.onyx_data.template 
        || '/src/layouts/default.html';

        let template = this.hbs(readFileSync(this.config.APP_FOLDER + templatePath).toString());
      
        return res.send(template({ ...page, assets: this.userConfig.fe_assets_list })); 
    }
}
