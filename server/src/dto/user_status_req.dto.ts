// check-online-status.dto.ts
import { Transform } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class CheckOnlineStatusDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
    ids: string[];
}
