import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMerchantDto {
  @IsNotEmpty({ message: 'name is required' })
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  ruc!: string;

  @IsNotEmpty({ message: 'country_code is required' })
  @IsString()
  country_code!: string;
}

export class UpdateMerchantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  ruc?: string;

  @IsOptional()
  @IsString()
  country_code?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'], { message: 'status must be active or inactive' })
  status?: string;
}
