import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { environments } from '../../config/environments.js';

export class AmountDetailsDto {
  @IsNotEmpty({ message: 'orderInformation.amountDetails.totalAmount is required' })
  @IsString()
  totalAmount!: string;

  @IsNotEmpty({ message: 'orderInformation.amountDetails.currency is required' })
  @IsString()
  currency!: string;
}

export class BillToDto {
  @IsOptional() @IsString() address1?: string;
  @IsOptional() @IsString() administrativeArea?: string;
  @IsOptional() @IsString() buildingNumber?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() locality?: string;
  @IsOptional() @IsString() postalCode?: string;

  @IsOptional()
  @IsEmail({}, { message: 'orderInformation.billTo.email must be a valid email' })
  email?: string;

  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() middleName?: string;
  @IsOptional() @IsString() nameSuffix?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() phoneNumber?: string;
  @IsOptional() @IsString() phoneType?: string;
}

export class ShipToDto {
  @IsOptional() @IsString() address1?: string;
  @IsOptional() @IsString() administrativeArea?: string;
  @IsOptional() @IsString() buildingNumber?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() locality?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
}

export class OrderInformationDto {
  @IsDefined({ message: 'orderInformation.amountDetails is required' })
  @ValidateNested()
  @Type(() => AmountDetailsDto)
  amountDetails!: AmountDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BillToDto)
  billTo?: BillToDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShipToDto)
  shipTo?: ShipToDto;
}

export class CaptureMandateDto {
  @IsOptional() @IsIn(['FULL', 'PARTIAL', 'NONE']) billingType?: string;
  @IsOptional() @IsBoolean() requestEmail?: boolean;
  @IsOptional() @IsBoolean() requestPhone?: boolean;
  @IsOptional() @IsBoolean() requestShipping?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) shipToCountries?: string[];
  @IsOptional() @IsBoolean() showAcceptedNetworkIcons?: boolean;
}

export class CompleteMandateDto {
  @IsOptional() @IsIn(['AUTH', 'PREFER_AUTH', 'CAPTURE', 'SALE']) type?: string;
  @IsOptional() @IsBoolean() decisionManager?: boolean;
  @IsOptional() @IsBoolean() consumerAuthentication?: boolean;
}

const VALID_CARD_NETWORKS = ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'JCB', 'DINERSCLUB'];
const VALID_PAYMENT_TYPES = ['APPLEPAY', 'CHECK', 'CLICKTOPAY', 'GOOGLEPAY', 'PANENTRY', 'PAZE'];

export class CreateSessionDto {
  @IsArray({ message: 'targetOrigins must be an array' })
  @ArrayNotEmpty({ message: 'targetOrigins is required and must be a non-empty array of URLs' })
  @IsUrl(
    { require_tld: environments.NODE_ENV === 'production' },
    { each: true, message: 'Each entry in targetOrigins must be a valid URL' }
  )
  targetOrigins!: string[];

  @IsDefined({ message: 'orderInformation is required' })
  @ValidateNested()
  @Type(() => OrderInformationDto)
  orderInformation!: OrderInformationDto;

  @IsOptional()
  @IsArray()
  @IsIn(VALID_CARD_NETWORKS, { each: true, message: 'Invalid card network in allowedCardNetworks' })
  allowedCardNetworks?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(VALID_PAYMENT_TYPES, { each: true, message: 'Invalid payment type in allowedPaymentTypes' })
  allowedPaymentTypes?: string[];

  @IsOptional() @ValidateNested() @Type(() => CaptureMandateDto) captureMandate?: CaptureMandateDto;
  @IsOptional() @ValidateNested() @Type(() => CompleteMandateDto) completeMandate?: CompleteMandateDto;

  @IsOptional()
  @IsUrl({}, { message: 'callback_url must be a valid URL' })
  callback_url?: string;

  @IsOptional() @IsString() clientVersion?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() locale?: string;
}

export class ProcessPaymentDto {
  @IsNotEmpty({ message: 'transientToken is required' })
  @IsString()
  transientToken!: string;

  @IsOptional()
  @IsString()
  referenceCode?: string;
}

export class CompleteSessionDto {
  @IsOptional()
  @IsIn(['DECLINED', 'COMPLETED'], { message: 'status must be DECLINED or COMPLETED' })
  status?: string;
}
