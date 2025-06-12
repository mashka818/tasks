module.exports = (sequelize, Sequelize) => {
  const Project = sequelize.define("projects", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT
    },
    status: {
      type: Sequelize.ENUM('active', 'completed', 'on_hold', 'cancelled'),
      defaultValue: 'active'
    },
    startDate: {
      type: Sequelize.DATEONLY
    },
    endDate: {
      type: Sequelize.DATEONLY
    },
    location: {
      type: Sequelize.STRING
    },
    budget: {
      type: Sequelize.DECIMAL(15, 2)
    },
    clientName: {
      type: Sequelize.STRING
    },
    clientContact: {
      type: Sequelize.STRING
    }
  });

  return Project;
}; 

