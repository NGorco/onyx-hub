import { Global, Module } from "@nestjs/common";
import { Config, ConfigClass } from "../../application/config";
import { drizzle } from 'drizzle-orm/node-postgres';

@Module({
    providers: [
        { provide: 'db', inject: [ConfigClass], useFactory: (config: ConfigClass) => drizzle(config.DB_URL) },
        { provide: ConfigClass, useValue: Config }
    ],
    exports:
        [{ provide: ConfigClass, useValue: Config },
        { provide: 'db', inject: [ConfigClass], useFactory: (config: ConfigClass) => drizzle(config.DB_URL) },
        ]
})
@Global()
export class SharedModule { }