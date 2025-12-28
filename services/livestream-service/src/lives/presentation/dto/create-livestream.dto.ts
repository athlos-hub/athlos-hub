import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateLiveDto {
  @IsNotEmpty()
  @IsUUID()
  externalMatchId!: string;

  @IsNotEmpty()
  @IsUUID()
  organizationId!: string;
}
