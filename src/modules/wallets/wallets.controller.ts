import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import {
  DepositDto,
  WithdrawalDto,
  WalletTransactionQueryDto,
} from './dto/wallet.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/interfaces/enums';

@ApiTags('wallets')
@ApiBearerAuth()
@Controller('wallets')
export class WalletsController {
  constructor(private readonly service: WalletsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Mi monedero' })
  getBalance(@CurrentUser() user: JwtPayload) {
    return this.service.getBalance(user.sub);
  }

  @Post('me/deposits')
  @ApiOperation({ summary: 'Depositar a monedero' })
  deposit(@CurrentUser() user: JwtPayload, @Body() dto: DepositDto) {
    return this.service.deposit(user.sub, dto);
  }

  @Post('me/withdrawals')
  @Roles(Role.PURIFIER, Role.DELIVERY)
  @ApiOperation({ summary: 'Retirar de monedero' })
  withdraw(@CurrentUser() user: JwtPayload, @Body() dto: WithdrawalDto) {
    return this.service.withdraw(user.sub, dto);
  }

  @Get('me/transactions')
  @ApiOperation({ summary: 'Historial de transacciones' })
  findTransactions(
    @CurrentUser() user: JwtPayload,
    @Query() query: WalletTransactionQueryDto,
  ) {
    return this.service.findTransactions(user.sub, query);
  }
}
