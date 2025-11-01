'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create transaction_logs table
    await queryInterface.createTable('transaction_logs', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      action_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      entity_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      details: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Create indexes for better query performance
    await queryInterface.addIndex('transaction_logs', ['user_id'], {
      name: 'idx_transaction_logs_user_id',
    });

    await queryInterface.addIndex('transaction_logs', ['entity_type'], {
      name: 'idx_transaction_logs_entity_type',
    });

    await queryInterface.addIndex('transaction_logs', ['entity_id'], {
      name: 'idx_transaction_logs_entity_id',
    });

    await queryInterface.addIndex('transaction_logs', ['action_type'], {
      name: 'idx_transaction_logs_action_type',
    });

    await queryInterface.addIndex('transaction_logs', ['status'], {
      name: 'idx_transaction_logs_status',
    });

    await queryInterface.addIndex('transaction_logs', ['createdAt'], {
      name: 'idx_transaction_logs_created_at',
    });

    // Composite index for common query patterns
    await queryInterface.addIndex('transaction_logs', ['entity_type', 'entity_id'], {
      name: 'idx_transaction_logs_entity',
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes
    await queryInterface.removeIndex('transaction_logs', 'idx_transaction_logs_entity');
    await queryInterface.removeIndex('transaction_logs', 'idx_transaction_logs_created_at');
    await queryInterface.removeIndex('transaction_logs', 'idx_transaction_logs_status');
    await queryInterface.removeIndex('transaction_logs', 'idx_transaction_logs_action_type');
    await queryInterface.removeIndex('transaction_logs', 'idx_transaction_logs_entity_id');
    await queryInterface.removeIndex('transaction_logs', 'idx_transaction_logs_entity_type');
    await queryInterface.removeIndex('transaction_logs', 'idx_transaction_logs_user_id');

    // Drop table
    await queryInterface.dropTable('transaction_logs');
  },
};
