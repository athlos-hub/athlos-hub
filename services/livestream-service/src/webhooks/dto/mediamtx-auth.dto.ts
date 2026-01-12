import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class MediaMTXAuthDto {
  @IsNotEmpty()
  @IsString()
  ip!: string;

  @IsNotEmpty()
  @IsString()
  user!: string;

  @IsNotEmpty()
  @IsString()
  password!: string;

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
