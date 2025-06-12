const db = require('../models');
const User = db.user;
const ROLES = db.ROLES;

checkDuplicateUsernameOrEmail = async (req, res, next) => {
  try {
    // Проверка username
    let user = await User.findOne({
      where: {
        username: req.body.username
      }
    });

    if (user) {
      return res.status(400).send({
        message: 'Ошибка! Имя пользователя уже используется!'
      });
    }

    // Проверка email
    user = await User.findOne({
      where: {
        email: req.body.email
      }
    });

    if (user) {
      return res.status(400).send({
        message: 'Ошибка! Email уже используется!'
      });
    }

    next();
  } catch (error) {
    return res.status(500).send({
      message: 'Внутренняя ошибка сервера'
    });
  }
};

checkRolesExisted = (req, res, next) => {
  if (req.body.roles) {
    for (let i = 0; i < req.body.roles.length; i++) {
      if (!ROLES.includes(req.body.roles[i])) {
        return res.status(400).send({
          message: `Ошибка! Роль ${req.body.roles[i]} не существует!`
        });
      }
    }
  }
  
  next();
};

const verifySignUp = {
  checkDuplicateUsernameOrEmail,
  checkRolesExisted
};

module.exports = verifySignUp; 