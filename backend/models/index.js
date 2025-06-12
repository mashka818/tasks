const { Sequelize } = require('sequelize');
const config = require('../config/db.config');

const sequelize = new Sequelize(
  config.DB,
  config.USER,
  config.PASSWORD,
  {
    host: config.HOST,
    dialect: config.dialect,
    logging: false,
    pool: {
      max: config.pool.max,
      min: config.pool.min,
      acquire: config.pool.acquire,
      idle: config.pool.idle
    }
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.user = require('./user.model.js')(sequelize, Sequelize);
db.role = require('./role.model.js')(sequelize, Sequelize);
db.project = require('./project.model.js')(sequelize, Sequelize);
db.task = require('./task.model.js')(sequelize, Sequelize);

// Связи между моделями
db.role.belongsToMany(db.user, {
  through: "user_roles",
  foreignKey: "roleId",
  otherKey: "userId"
});

db.user.belongsToMany(db.role, {
  through: "user_roles",
  foreignKey: "userId",
  otherKey: "roleId"
});

db.user.hasMany(db.project, { as: "managedProjects", foreignKey: "managerId" });
db.project.belongsTo(db.user, { as: "manager", foreignKey: "managerId" });

db.project.hasMany(db.task, { foreignKey: "projectId" });
db.task.belongsTo(db.project, { foreignKey: "projectId" });

db.user.hasMany(db.task, { as: "assignedTasks", foreignKey: "assigneeId" });
db.task.belongsTo(db.user, { as: "assignee", foreignKey: "assigneeId" });

// Заранее определенные роли
db.ROLES = ["admin", "manager", "worker"];

module.exports = db;
