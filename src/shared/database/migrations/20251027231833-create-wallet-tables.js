'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create enum type for transaction types
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "wallet_transaction_type" AS ENUM ('deposit', 'withdraw', 'purchase', 'earning');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create wallets table
    await queryInterface.createTable('wallets', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      balance: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Add CHECK constraint to prevent negative balance
    await queryInterface.addConstraint('wallets', {
      fields: ['balance'],
      type: 'check',
      name: 'wallets_balance_non_negative',
      where: {
        balance: {
          [Sequelize.Op.gte]: 0,
        },
      },
    });

    // Create wallet_transactions table
    await queryInterface.createTable('wallet_transactions', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      wallet_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'wallets',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('deposit', 'withdraw', 'purchase', 'earning'),
        allowNull: false,
      },
      amount: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      balance_before: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      balance_after: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      idempotency_key: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Create indexes for better query performance
    await queryInterface.addIndex('wallet_transactions', ['wallet_id'], {
      name: 'idx_wallet_transactions_wallet_id',
    });

    await queryInterface.addIndex('wallet_transactions', ['type'], {
      name: 'idx_wallet_transactions_type',
    });

    await queryInterface.addIndex('wallet_transactions', ['createdAt'], {
      name: 'idx_wallet_transactions_created_at',
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes
    await queryInterface.removeIndex('wallet_transactions', 'idx_wallet_transactions_created_at');
    await queryInterface.removeIndex('wallet_transactions', 'idx_wallet_transactions_type');
    await queryInterface.removeIndex('wallet_transactions', 'idx_wallet_transactions_wallet_id');

    // Drop constraints
    await queryInterface.removeConstraint('wallets', 'wallets_balance_non_negative');

    // Drop tables
    await queryInterface.dropTable('wallet_transactions');
    await queryInterface.dropTable('wallets');

    // Drop enum type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "wallet_transaction_type";');
  },
};
