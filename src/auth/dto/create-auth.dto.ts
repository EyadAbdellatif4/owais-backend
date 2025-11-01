import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ErrorMessage } from '../../shared/enums';

export class RegisterDto {
  @ApiProperty({ 
    example: 'John Doe', 
    description: 'The full name of the user',
    minLength: 3,
    maxLength: 100,
  })
  @IsNotEmpty({ message: ErrorMessage.NAME_REQUIRED })
  @IsString({ message: ErrorMessage.NAME_MUST_BE_STRING })
  @MinLength(3, { message: ErrorMessage.NAME_MIN_LENGTH })
  @MaxLength(100, { message: ErrorMessage.NAME_MAX_LENGTH })
  name: string;

  @ApiProperty({ 
    example: 'SecurePassword123!', 
    description: 'The password for the user account',
    minLength: 6,
    maxLength: 255,
    format: 'password'
  })
  @IsNotEmpty({ message: ErrorMessage.PASSWORD_REQUIRED })
  @IsString({ message: ErrorMessage.PASSWORD_MUST_BE_STRING })
  @MinLength(6, { message: ErrorMessage.PASSWORD_MIN_LENGTH })
  @MaxLength(255, { message: ErrorMessage.PASSWORD_MAX_LENGTH })
  password: string;

  @ApiProperty({ 
    example: 'john.doe@example.com', 
    description: 'The email address of the user (must be unique)',
    format: 'email',
    maxLength: 50
  })
  @IsNotEmpty({ message: ErrorMessage.EMAIL_REQUIRED })
  @IsEmail({}, { message: ErrorMessage.EMAIL_INVALID })
  @MaxLength(50, { message: ErrorMessage.EMAIL_MAX_LENGTH })
  email: string;
}

export class LoginDto {
  @ApiProperty({ 
    example: 'john.doe@example.com', 
    description: 'The email address of the user',
    format: 'email'
  })
  @IsNotEmpty({ message: ErrorMessage.EMAIL_REQUIRED })
  @IsEmail({}, { message: ErrorMessage.EMAIL_INVALID })
  email: string;

  @ApiProperty({ 
    example: '1q2w3e4r5t', 
    description: 'The password for the user account',
    format: 'password'
  })
  @IsNotEmpty({ message: ErrorMessage.PASSWORD_REQUIRED })
  @IsString({ message: ErrorMessage.PASSWORD_MUST_BE_STRING })
  password: string;
}
