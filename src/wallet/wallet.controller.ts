import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DepositWalletDto } from './dto/deposit-wallet.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { WalletResponseDto } from './dto/wallet-response.dto';
import { WalletTransaction } from './entities/wallet-transaction.entity';

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deposit funds to wallet' })
  @ApiBody({ type: DepositWalletDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Funds deposited successfully',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid amount or idempotency key',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Idempotency key already used with different parameters',
  })
  async deposit(
    @CurrentUser() user: any,
    @Body() depositDto: DepositWalletDto,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.walletService.deposit(user.id, depositDto);
    return this.mapTransactionToResponseDto(transaction);
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw funds from wallet' })
  @ApiBody({ type: WithdrawWalletDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Funds withdrawn successfully',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid amount or insufficient funds',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Idempotency key already used with different parameters',
  })
  async withdraw(
    @CurrentUser() user: any,
    @Body() withdrawDto: WithdrawWalletDto,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.walletService.withdraw(user.id, withdrawDto);
    return this.mapTransactionToResponseDto(transaction);
  }

  @Get()
  @ApiOperation({ summary: 'Get current wallet balance' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wallet balance retrieved successfully',
    type: WalletResponseDto,
  })
  async getBalance(@CurrentUser() user: any): Promise<WalletResponseDto> {
    return this.walletService.getBalance(user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get wallet transaction history' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transactions retrieved successfully',
  })
  async getTransactions(
    @CurrentUser() user: any,
    @Query() query: TransactionQueryDto,
  ): Promise<{
    transactions: TransactionResponseDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const result = await this.walletService.getTransactions(user.id, query);
    
    return {
      ...result,
      transactions: result.transactions.map((t) => this.mapTransactionToResponseDto(t)),
    };
  }

  /**
   * Map database transaction to response DTO
   */
  private mapTransactionToResponseDto(
    transaction: WalletTransaction,
  ): TransactionResponseDto {
    return {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount / 100, // Convert cents to dollars
      balance_before: transaction.balance_before / 100,
      balance_after: transaction.balance_after / 100,
      description: transaction.description || undefined,
      metadata: transaction.metadata || undefined,
      createdAt: transaction.createdAt,
    };
  }
}
