'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create products table
    await queryInterface.createTable('products', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      availableUnits: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      merchant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

    // Add CHECK constraint to prevent negative availableUnits
    await queryInterface.addConstraint('products', {
      fields: ['availableUnits'],
      type: 'check',
      name: 'products_available_units_non_negative',
      where: {
        availableUnits: {
          [Sequelize.Op.gte]: 0,
        },
      },
    });

    // Add CHECK constraint to ensure price is positive
    await queryInterface.addConstraint('products', {
      fields: ['price'],
      type: 'check',
      name: 'products_price_positive',
      where: {
        price: {
          [Sequelize.Op.gt]: 0,
        },
      },
    });

    // Create index on merchant_id for better query performance
    await queryInterface.addIndex('products', ['merchant_id'], {
      name: 'idx_products_merchant_id',
    });

    // Create index on availableUnits for filtering purchasable products
    await queryInterface.addIndex('products', ['availableUnits'], {
      name: 'idx_products_available_units',
    });
  },

  async down (queryInterface, Sequelize) {
    // Drop indexes
    await queryInterface.removeIndex('products', 'idx_products_available_units');
    await queryInterface.removeIndex('products', 'idx_products_merchant_id');

    // Drop constraints
    await queryInterface.removeConstraint('products', 'products_price_positive');
    await queryInterface.removeConstraint('products', 'products_available_units_non_negative');

    // Drop table
    await queryInterface.dropTable('products');
  }
};
