'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'stripe_session_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'gateway_transaction_id',
    });

    await queryInterface.addColumn('orders', 'stripe_payment_intent_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'stripe_session_id',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('orders', 'stripe_payment_intent_id');
    await queryInterface.removeColumn('orders', 'stripe_session_id');
  }
};
