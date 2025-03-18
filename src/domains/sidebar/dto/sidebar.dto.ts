import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsOptional, IsString, ValidateNested } from "class-validator";

class SidebarElement {
    @IsString()
    @ApiProperty({
        type: String
    })
    link!: string

    @IsString()
    @ApiProperty({
        type: String
    })
    label!: string
}

export class GetSideBarOutput {
    @IsArray()
    @IsOptional()
    @Type(() => SidebarElement)
    @ValidateNested({ always: true, each: true })
    @ApiProperty({
        example: [
            {link: 'https://google.com', label: 'Google'}
        ],
        isArray: true,
        type: SidebarElement,
    })
    sidebarElements!: SidebarElement[];

}