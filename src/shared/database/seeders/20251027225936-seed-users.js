'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const existingUser = await queryInterface.sequelize.query(
      `SELECT email FROM users WHERE email = 'eyadKing@gmail.com'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingUser.length === 0) {
      await queryInterface.bulkInsert('users', [
        {
          id: Sequelize.literal('gen_random_uuid()'),
          email: 'eyadKing@gmail.com',
          password: '$2b$10$ZbHihIVmR9jis6U3QqDh3.1vnBQzLEIf78EkJKJG9FfIMUl4BtPu6',
          name: 'eyad',
          is_active: true,
          role_id: '7f02ff64-99b2-47d5-9d0d-07441bc501c3',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ], {});
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', {
      email: 'eyadKing@gmail.com'
    }, {});
  }
};
