import { User } from '../../users/entities/user.entity';
import { Role } from '../../role/entities/role.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { WalletTransaction } from '../../wallet/entities/wallet-transaction.entity';
import { Product } from '../../product/entities/product.entity';
import { Order } from '../../order/entities/order.entity';
import { TransactionLog } from './entities/transaction-log.entity';

export default () => {
  return [User, Role, Wallet, WalletTransaction, Product, Order, TransactionLog];
};
