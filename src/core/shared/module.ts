import { Global, Module } from "@nestjs/common";
import { Config, ConfigClass } from "../../application/config";
import { drizzle } from 'drizzle-orm/node-postgres';
import { UserConfigClass } from "../../application/user_config";
import Handlebars from "handlebars";

const UserConfig = new UserConfigClass(Config);
export const HandlebarsSymbol = Symbol('handlebars')

@Module({
    providers: [
        { provide: HandlebarsSymbol, useValue: Handlebars.compile },
        { provide: 'db', inject: [ConfigClass], useFactory: (config: ConfigClass) => drizzle(config.DB_URL) },
        { provide: ConfigClass, useValue: Config },
        { provide: UserConfigClass, useValue: UserConfig },
    ],
    exports:
        [
            { provide: HandlebarsSymbol, useValue: Handlebars.compile },
            { provide: UserConfigClass, useValue: UserConfig },
            { provide: ConfigClass, useValue: Config },
            { provide: 'db', inject: [ConfigClass], useFactory: (config: ConfigClass) => drizzle(config.DB_URL) },
        ]
})
@Global()
export class SharedModule { }