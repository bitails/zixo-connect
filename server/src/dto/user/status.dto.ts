import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsString,
  ArrayNotEmpty,
  IsArray,
} from 'class-validator';

export class UserStatusResDto {
  @ApiProperty({
    description: 'The ID of the user',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty({
    description: 'The online status of the user',
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  status: boolean;
}

export class CheckOnlineStatusDto {
  @ApiProperty({
    description: 'Array of user IDs to check their online status',
    type: [String],
    example: ['123456', '7891011'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  ids: string[];
}
