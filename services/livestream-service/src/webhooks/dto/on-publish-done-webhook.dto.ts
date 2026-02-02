import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class OnPublishDoneWebhookDto {
  @IsNotEmpty()
  @IsString()
  path!: string;

  @IsOptional()
  @IsString()
  protocol?: string;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  user?: string;
}
