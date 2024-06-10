import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsString } from "class-validator";

export class UserStatus {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    id: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsBoolean()
    status: boolean;
}