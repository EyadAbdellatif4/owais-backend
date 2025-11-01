import { ApiProperty } from '@nestjs/swagger';

export class WalletResponseDto {
  @ApiProperty({
    example: 1000.50,
    description: 'Current wallet balance in dollars',
  })
  declare balance: number;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email',
  })
  declare user_email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User name',
  })
  declare user_name: string;
}

