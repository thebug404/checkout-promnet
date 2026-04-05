import { IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CreatePspCredentialDto {
  @IsOptional()
  @IsString()
  merchant_id?: string;

  @IsNotEmpty({ message: 'psp_name is required' })
  @IsString()
  psp_name!: string;

  @IsOptional()
  @IsString()
  credential_ref?: string;

  @ValidateIf((o: CreatePspCredentialDto) => o.psp_name === 'cybersource')
  @IsNotEmpty({ message: 'cybersource_merchant_id is required for CyberSource PSP' })
  @IsString()
  cybersource_merchant_id?: string;

  @ValidateIf((o: CreatePspCredentialDto) => o.psp_name === 'cybersource')
  @IsNotEmpty({ message: 'cybersource_key_id is required for CyberSource PSP' })
  @IsString()
  cybersource_key_id?: string;

  @ValidateIf((o: CreatePspCredentialDto) => o.psp_name === 'cybersource')
  @IsNotEmpty({ message: 'cybersource_secret_key is required for CyberSource PSP' })
  @IsString()
  cybersource_secret_key?: string;
}

export class UpdatePspCredentialDto {
  @IsOptional()
  @IsString()
  credential_ref?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  cybersource_merchant_id?: string;

  @IsOptional()
  @IsString()
  cybersource_key_id?: string;

  @IsOptional()
  @IsString()
  cybersource_secret_key?: string;
}
