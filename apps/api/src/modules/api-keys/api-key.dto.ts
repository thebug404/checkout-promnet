import { IsArray, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUrl, IsIP } from 'class-validator';

export class CreateApiKeyDto {
  @IsNotEmpty({ message: 'role_id is required' })
  @IsString()
  role_id!: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true, message: 'Each entry in allowed_origins must be a valid URL' })
  allowed_origins?: string[];

  @IsOptional()
  @IsArray()
  @IsIP(undefined, { each: true, message: 'Each entry in ip_whitelist must be a valid IP address' })
  ip_whitelist?: string[];

  @IsOptional()
  @IsISO8601({}, { message: 'expires_at must be a valid ISO 8601 date' })
  expires_at?: string;

  @IsOptional()
  @IsString()
  created_by?: string;

  constructor(data?: Partial<CreateApiKeyDto>) {
    if (data) Object.assign(this, data);
  }
}

export class UpdateApiKeyDto {
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true, message: 'Each entry in allowed_origins must be a valid URL' })
  allowed_origins?: string[];

  @IsOptional()
  @IsArray()
  @IsIP(undefined, { each: true, message: 'Each entry in ip_whitelist must be a valid IP address' })
  ip_whitelist?: string[];

  @IsOptional()
  @IsISO8601({}, { message: 'expires_at must be a valid ISO 8601 date' })
  expires_at?: string;

  constructor(data?: Record<string, unknown>) {
    if (data) Object.assign(this, data);
  }
}
