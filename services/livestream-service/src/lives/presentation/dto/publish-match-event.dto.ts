import { IsNotEmpty, IsString, IsObject } from 'class-validator';

export class PublishMatchEventDto {
  @IsNotEmpty()
  @IsString()
  eventType!: string;

  @IsNotEmpty()
  @IsObject()
  eventData!: Record<string, unknown>;
}
