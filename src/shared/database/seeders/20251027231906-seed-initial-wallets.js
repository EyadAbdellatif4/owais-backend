'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if wallets table has any data
    const existingWallets = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM wallets;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // If wallets already exist, skip seeding
    if (existingWallets[0].count > 0) {
      console.log('Wallets already exist, skipping seeder');
      return;
    }

    // Get all existing users
    const users = await queryInterface.sequelize.query(
      'SELECT id FROM users;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Create wallets for all existing users with zero balance
    for (const user of users) {
      await queryInterface.bulkInsert('wallets', [
        {
          id: Sequelize.literal('gen_random_uuid()'),
          user_id: user.id,
          balance: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove all wallets
    await queryInterface.bulkDelete('wallets', null, {});
  },
};
