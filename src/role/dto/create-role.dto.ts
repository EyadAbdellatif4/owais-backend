import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ErrorMessage } from '../../shared/enums';

export class CreateRoleDto {
  @ApiProperty({
    example: 'merchant',
    description: 'The name of the role',
    minLength: 2,
    maxLength: 50,
  })
  @IsNotEmpty({ message: ErrorMessage.ROLE_NAME_REQUIRED })
  @IsString({ message: ErrorMessage.ROLE_NAME_MUST_BE_STRING })
  @MinLength(2, { message: ErrorMessage.ROLE_NAME_MIN_LENGTH })
  @MaxLength(50, { message: ErrorMessage.ROLE_NAME_MAX_LENGTH })
  @Matches(/^[a-zA-Z_]+$/, {
    message: 'Role name must contain only letters and underscores',
  })
  name: string;
}

