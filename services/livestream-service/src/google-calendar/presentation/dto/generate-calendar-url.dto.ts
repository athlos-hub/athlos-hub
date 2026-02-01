import {
  IsNotEmpty,
  IsUUID,
  IsArray,
  IsString,
  IsOptional,
  ValidateNested,
  IsInt,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TeamDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  logo?: string;
}

export class MatchDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => TeamDto)
  homeTeam?: TeamDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TeamDto)
  awayTeam?: TeamDto;

  @IsOptional()
  @IsDateString()
  scheduledDatetime?: string;

  @IsOptional()
  @IsString()
  competitionName?: string;

  @IsOptional()
  @IsString()
  roundName?: string;

  @IsOptional()
  @IsString()
  groupName?: string;

  @IsOptional()
  @IsString()
  local?: string;

  @IsOptional()
  @IsString()
  externalMatchId?: string;

  @IsOptional()
  @IsInt()
  homeScore?: number;

  @IsOptional()
  @IsInt()
  awayScore?: number;
}

export class GenerateCalendarUrlDto {
  @IsNotEmpty()
  @IsUUID()
  liveId!: string;

  @IsOptional()
  @IsString()
  frontendBaseUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MatchDto)
  match?: MatchDto;
}

export class GenerateMultipleCalendarUrlsDto {
  @IsNotEmpty()
  @IsArray()
  @IsUUID(undefined, { each: true })
  liveIds!: string[];

  @IsOptional()
  @IsString()
  frontendBaseUrl?: string;

  @IsOptional()
  matchesByLiveId?: Record<string, MatchDto>;
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

  @IsOptional()
  @ValidateNested()
  @Type(() => MatchDto)
  match?: MatchDto;
}

export class CreateMultipleCalendarEventsDto {
  @IsNotEmpty()
  @IsArray()
  @IsUUID(undefined, { each: true })
  liveIds!: string[];

  @IsOptional()
  @IsString()
  frontendBaseUrl?: string;

  @IsOptional()
  force?: boolean;

  @IsOptional()
  matchesByLiveId?: Record<string, MatchDto>;
}
