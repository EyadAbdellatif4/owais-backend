import { ApiProperty } from '@nestjs/swagger';

export class ValidationErrorDto {
  @ApiProperty({ 
    example: 400, 
    description: 'HTTP status code',
    type: 'number'
  })
  statusCode: number;

  @ApiProperty({ 
    example: ['email must be a valid email', 'password must be at least 6 characters'],
    description: 'Array of validation error messages',
    type: [String]
  })
  message: string[];

  @ApiProperty({ 
    example: 'Bad Request', 
    description: 'Error type',
    type: 'string'
  })
  error: string;
}

export class UnauthorizedErrorDto {
  @ApiProperty({ 
    example: 401, 
    description: 'HTTP status code',
    type: 'number'
  })
  statusCode: number;

  @ApiProperty({ 
    example: 'Unauthorized', 
    description: 'Error type',
    type: 'string'
  })
  error: string;

  @ApiProperty({ 
    example: 'Access token is required', 
    description: 'Error message',
    type: 'string'
  })
  message: string;
}

export class NotFoundErrorDto {
  @ApiProperty({ 
    example: 404, 
    description: 'HTTP status code',
    type: 'number'
  })
  statusCode: number;

  @ApiProperty({ 
    example: 'Not Found', 
    description: 'Error type',
    type: 'string'
  })
  error: string;

  @ApiProperty({ 
    example: 'Resource not found', 
    description: 'Error message',
    type: 'string'
  })
  message: string;
}

export class ConflictErrorDto {
  @ApiProperty({ 
    example: 409, 
    description: 'HTTP status code',
    type: 'number'
  })
  statusCode: number;

  @ApiProperty({ 
    example: 'Conflict', 
    description: 'Error type',
    type: 'string'
  })
  error: string;

  @ApiProperty({ 
    example: 'Resource already exists', 
    description: 'Error message',
    type: 'string'
  })
  message: string;
}
