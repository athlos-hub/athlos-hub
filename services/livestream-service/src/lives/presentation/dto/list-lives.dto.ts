import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { LiveStatus } from '../../domain/enums/live-status.enum.js';

export class ListLivesDto {
  @IsOptional()
  @IsEnum(LiveStatus)
  status?: LiveStatus;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  externalMatchId?: string;
}
