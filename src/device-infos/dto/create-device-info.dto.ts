import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Type } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsNumber, IsObject, IsString, ValidateNested } from "class-validator";



export class ILocation {
    @IsNotEmpty()
    @IsNumber()
    lat: number;

    @IsNotEmpty()
    @IsNumber()
    lng: number;
}

export class CreateDeviceInfoDto {
     @IsNotEmpty()
    @IsString()
    device_id: string;

     @IsNotEmpty()
    @IsString()
    fcm_token: string;

     @IsNotEmpty()
    @IsBoolean()
    login_status: boolean;

    @IsNotEmpty()
    @ValidateNested()
    @Type(() => ILocation)
    location: ILocation;
  
   
}