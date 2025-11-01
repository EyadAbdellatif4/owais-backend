'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const roles = await queryInterface.sequelize.query(
      `SELECT name FROM roles WHERE name IN ('merchant', 'user')`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const existingRoles = roles.map(r => r.name);
    const rolesToInsert = [];

    if (!existingRoles.includes('merchant')) {
      rolesToInsert.push({
        id: Sequelize.literal('gen_random_uuid()'),
        name: 'merchant',
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    if (!existingRoles.includes('user')) {
      rolesToInsert.push({
        id: Sequelize.literal('gen_random_uuid()'),
        name: 'user',
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    if (rolesToInsert.length > 0) {
      await queryInterface.bulkInsert('roles', rolesToInsert, {});
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('roles', {
      name: { [Sequelize.Op.in]: ['merchant', 'user'] }
    }, {});
  }
};
