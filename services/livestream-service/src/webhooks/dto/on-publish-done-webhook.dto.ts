import { IsNotEmpty, IsString } from 'class-validator';

export class OnPublishDoneWebhookDto {
  @IsNotEmpty()
  @IsString()
  path!: string;

  @IsString()
  protocol?: string;

  @IsString()
  query?: string;

  @IsString()
  ip?: string;

  @IsString()
  user?: string;
}
