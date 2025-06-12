module.exports = (sequelize, Sequelize) => {
  const Task = sequelize.define("tasks", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT
    },
    status: {
      type: Sequelize.ENUM('planned', 'in_progress', 'completed'),
      defaultValue: 'planned'
    },
    priority: {
      type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium'
    },
    startDate: {
      type: Sequelize.DATEONLY
    },
    dueDate: {
      type: Sequelize.DATEONLY
    },
    completedDate: {
      type: Sequelize.DATEONLY
    },
    estimatedHours: {
      type: Sequelize.FLOAT
    },
    actualHours: {
      type: Sequelize.FLOAT
    },
    attachments: {
      type: Sequelize.JSON
    },
    notes: {
      type: Sequelize.TEXT
    }
  });

  return Task;
}; 