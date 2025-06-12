const db = require('../models');
const Role = db.role;

async function initializeRoles() {
  try {
    console.log('Checking if roles need to be initialized...');
    
    // Check if roles already exist
    const count = await Role.count();
    if (count > 0) {
      console.log('Roles are already initialized.');
      return;
    }
    
    console.log('Initializing roles...');
    
    // Create default roles
    const roles = await Promise.all([
      Role.create({ name: 'admin' }),
      Role.create({ name: 'manager' }),
      Role.create({ name: 'worker' }),
    ]);
    
    console.log('Roles initialized successfully:', roles.map(r => r.name).join(', '));
  } catch (error) {
    console.error('Error initializing roles:', error.message);
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  db.sequelize.sync()
    .then(() => {
      console.log('Database connected.');
      return initializeRoles();
    })
    .then(() => {
      console.log('Setup complete!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Setup failed:', err.message);
      process.exit(1);
    });
} else {
  // Export for use in other files
  module.exports = { initializeRoles };
} 