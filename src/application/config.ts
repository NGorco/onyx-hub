import { Injectable } from '@nestjs/common';
import { NODE_ENVS } from './consts';

@Injectable()
export class ConfigClass {
    readonly DB_URL!: string;
    readonly API_PORT!: number;
    readonly NODE_ENV!: ValueOf<typeof NODE_ENVS>;

    constructor() {
        const fields = Reflect.ownKeys(this) as string[];

        for (const field of fields) {
            const value = process.env[field];
            if (value === undefined) {
                throw new Error(`Missing required environment variable: ${field}`);
            }
            (this as any)[field] = isNaN(Number(value)) ? value : Number(value);
        }
    }
}


export const Config = new ConfigClass()