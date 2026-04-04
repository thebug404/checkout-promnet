import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMerchantDto {
  @IsNotEmpty({ message: 'name is required' })
  @IsString()
  name!: string;

  @IsNotEmpty({ message: 'ruc is required' })
  @IsString()
  ruc!: string;

  @IsNotEmpty({ message: 'country_code is required' })
  @IsString()
  country_code!: string;

  constructor(data?: Partial<CreateMerchantDto>) {
    if (data) Object.assign(this, data);
  }
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

  constructor(data?: Partial<UpdateMerchantDto>) {
    if (data) Object.assign(this, data);
  }
}
