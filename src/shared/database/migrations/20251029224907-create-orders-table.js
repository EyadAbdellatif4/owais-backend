'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create enum type for payment methods
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "payment_method" AS ENUM ('wallet', 'gateway');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create enum type for order status
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "order_status" AS ENUM ('pending', 'completed', 'failed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create orders table
    await queryInterface.createTable('orders', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      payment_method: {
        type: Sequelize.ENUM('wallet', 'gateway'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      gateway_transaction_id: {
        type: Sequelize.STRING(255),
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

    // Add CHECK constraint to ensure quantity is positive
    await queryInterface.sequelize.query(`
      ALTER TABLE orders
      ADD CONSTRAINT orders_quantity_positive
      CHECK (quantity > 0);
    `);

    // Add CHECK constraint to ensure total_amount is positive
    await queryInterface.sequelize.query(`
      ALTER TABLE orders
      ADD CONSTRAINT orders_total_amount_positive
      CHECK (total_amount > 0);
    `);

    // Create indexes for better query performance
    await queryInterface.addIndex('orders', ['user_id'], {
      name: 'idx_orders_user_id',
    });

    await queryInterface.addIndex('orders', ['product_id'], {
      name: 'idx_orders_product_id',
    });

    await queryInterface.addIndex('orders', ['status'], {
      name: 'idx_orders_status',
    });

    await queryInterface.addIndex('orders', ['createdAt'], {
      name: 'idx_orders_created_at',
    });

    await queryInterface.addIndex('orders', ['payment_method'], {
      name: 'idx_orders_payment_method',
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes
    await queryInterface.removeIndex('orders', 'idx_orders_payment_method');
    await queryInterface.removeIndex('orders', 'idx_orders_created_at');
    await queryInterface.removeIndex('orders', 'idx_orders_status');
    await queryInterface.removeIndex('orders', 'idx_orders_product_id');
    await queryInterface.removeIndex('orders', 'idx_orders_user_id');

    // Drop constraints
    await queryInterface.removeConstraint('orders', 'orders_total_amount_positive');
    await queryInterface.removeConstraint('orders', 'orders_quantity_positive');

    // Drop table
    await queryInterface.dropTable('orders');

    // Drop enum types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "order_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "payment_method";');
  },
};
