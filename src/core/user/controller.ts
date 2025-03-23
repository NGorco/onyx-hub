import { Body, Controller, Get, Inject, Post } from "@nestjs/common";
import { CreateUserDTO, GetUserDTO } from "./dto/user.dto";

@Controller()
export class UserController {
    constructor(@Inject('db') private db: any) { }

    @Post('/')
    async createUser(@Body() input: CreateUserDTO): Promise<GetUserDTO> {
        return {} as any;
    }

    @Get('/{userId}')
    async getUser() {
        
    }
}