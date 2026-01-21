import { IsNotEmpty, IsString, IsOptional, ValidateIf } from 'class-validator';

export class MediaMTXAuthDto {
  @IsNotEmpty()
  @IsString()
  ip!: string;

  @ValidateIf((o) => o.user !== undefined)
  @IsString()
  user?: string;

  @ValidateIf((o) => o.password !== undefined)
  @IsString()
  password?: string;

  @IsNotEmpty()
  @IsString()
  path!: string;

  @IsNotEmpty()
  @IsString()
  protocol!: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsNotEmpty()
  @IsString()
  action!: string;

  @IsOptional()
  @IsString()
  query?: string;
}
