import { Controller, Get, Req, Res } from "@nestjs/common";
import { PagesService } from "./service";
import { Request, Response } from "express";
import { ConfigClass } from "../../application/config";

@Controller()
export class PagesController {
    constructor(private service: PagesService, private config: ConfigClass) { }

    @Get('*')
    handleAll(@Req() req: Request, @Res() res: Response) {
        const path = req.path;

        // исключаем /api и /assets
        if (path.startsWith('/api') || path.startsWith('/assets')) {
            return res.status(404).send('Not found');
        }

        // тут рендеришь HTML (например SSR)
        return res.sendFile('/src/layouts/default.html', { root: this.config.APP_FOLDER }); // путь подставь свой
    }
}
