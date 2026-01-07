import { IsEnum, IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';
import { MatchEventType } from '../../domain/enums/match-event-type.enum.js';

class BaseEventPayloadDto {
  @IsOptional()
  @IsNumber()
  minute?: number;

  @IsOptional()
  @IsString()
  period?: string;
}

export class GoalEventPayloadDto extends BaseEventPayloadDto {
  @IsNotEmpty()
  @IsString()
  player!: string;

  @IsNotEmpty()
  @IsString()
  team!: string;

  @IsOptional()
  @IsString()
  assistedBy?: string;
}

export class CardEventPayloadDto extends BaseEventPayloadDto {
  @IsNotEmpty()
  @IsString()
  player!: string;

  @IsNotEmpty()
  @IsString()
  team!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class SubstitutionEventPayloadDto extends BaseEventPayloadDto {
  @IsNotEmpty()
  @IsString()
  playerIn!: string;

  @IsNotEmpty()
  @IsString()
  playerOut!: string;

  @IsNotEmpty()
  @IsString()
  team!: string;
}

export class PeriodEventPayloadDto {
  @IsNotEmpty()
  @IsString()
  period!: string;
}

export class FoulEventPayloadDto extends BaseEventPayloadDto {
  @IsNotEmpty()
  @IsString()
  player!: string;

  @IsNotEmpty()
  @IsString()
  team!: string;

  @IsOptional()
  @IsString()
  foulType?: string;
}

export class PenaltyEventPayloadDto extends BaseEventPayloadDto {
  @IsNotEmpty()
  @IsString()
  player!: string;

  @IsNotEmpty()
  @IsString()
  team!: string;

  @IsNotEmpty()
  @IsString()
  result!: string;
}

export class PublishMatchEventDto {
  @IsNotEmpty()
  @IsEnum(MatchEventType)
  type!: MatchEventType;

  @IsNotEmpty()
  payload!: Record<string, unknown>;
}
