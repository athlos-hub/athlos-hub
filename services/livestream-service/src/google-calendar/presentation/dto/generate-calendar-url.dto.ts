import { IsNotEmpty, IsUUID, IsArray, IsString, IsOptional } from 'class-validator';

export class GenerateCalendarUrlDto {
  @IsNotEmpty()
  @IsUUID()
  liveId!: string;

  @IsOptional()
  @IsString()
  frontendBaseUrl?: string;
}

export class GenerateMultipleCalendarUrlsDto {
  @IsNotEmpty()
  @IsArray()
  @IsUUID(undefined, { each: true })
  liveIds!: string[];

  @IsOptional()
  @IsString()
  frontendBaseUrl?: string;
}

export class CreateCalendarEventDto {
  @IsNotEmpty()
  @IsUUID()
  liveId!: string;

  @IsOptional()
  @IsString()
  frontendBaseUrl?: string;

  @IsOptional()
  force?: boolean;
}

export class CreateMultipleCalendarEventsDto {
  @IsNotEmpty()
  @IsArray()
  @IsUUID(undefined, { each: true })
  liveIds!: string[];

  @IsOptional()
  @IsString()
  frontendBaseUrl?: string;
}
