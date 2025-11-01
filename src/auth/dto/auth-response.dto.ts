import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'The unique identifier of the user'
  })
  id: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'The full name of the user'
  })
  name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'The email address of the user'
  })
  email: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'The ID of the role assigned to the user'
  })
  role_id: string;

  @ApiProperty({
    example: true,
    description: 'Whether the user account is active'
  })
  is_active: boolean;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'The date and time when the user was created'
  })
  createdAt: Date;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'The date and time when the user was last updated'
  })
  updatedAt: Date;
}

export class RegisterResponseDto {
  @ApiProperty({
    example: 'User registered successfully',
    description: 'Success message for user registration'
  })
  message: string;

  @ApiProperty({
    type: UserResponseDto,
    description: 'The registered user data (password excluded)'
  })
  user: UserResponseDto;
}

export class LoginResponseDto {
  @ApiProperty({
    example: 'User logged in successfully',
    description: 'Success message for user login'
  })
  message: string;

  @ApiProperty({
    type: UserResponseDto,
    description: 'The logged-in user data (password excluded)'
  })
  user: UserResponseDto;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token for authentication'
  })
  access_token: string;
}
