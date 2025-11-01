'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check if products table has any data
    const existingProducts = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM products;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // If products already exist, skip seeding
    if (existingProducts[0].count > 0) {
      console.log('Products already exist, skipping seeder');
      return;
    }

    // Get merchant role ID
    const merchantRole = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE name = 'merchant' LIMIT 1;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (merchantRole.length === 0) {
      console.log('No merchant role found, skipping product seeder');
      return;
    }

    const merchantRoleId = merchantRole[0].id;

    // Get all merchants (users with merchant role)
    const merchants = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE role_id = :merchantRoleId LIMIT 3;`,
      { 
        replacements: { merchantRoleId },
        type: Sequelize.QueryTypes.SELECT 
      }
    );

    if (merchants.length === 0) {
      console.log('No merchants found, skipping product seeder');
      return;
    }

    // Create sample products for merchants
    const products = [];
    const sampleProducts = [
      { name: 'Gift Card $50', price: 50.00, availableUnits: 10 },
      { name: 'Gift Card $100', price: 100.00, availableUnits: 5 },
      { name: 'Gift Card $25', price: 25.00, availableUnits: 20 },
    ];

    for (const merchant of merchants) {
      for (const sample of sampleProducts) {
        products.push({
          id: Sequelize.literal('gen_random_uuid()'),
          name: sample.name,
          price: sample.price,
          availableUnits: sample.availableUnits,
          merchant_id: merchant.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    if (products.length > 0) {
      await queryInterface.bulkInsert('products', products, {});
    }
  },

  async down (queryInterface, Sequelize) {
    // Remove all seeded products
    await queryInterface.bulkDelete('products', {
      name: {
        [Sequelize.Op.in]: ['Gift Card $50', 'Gift Card $100', 'Gift Card $25']
      }
    }, {});
  }
};
