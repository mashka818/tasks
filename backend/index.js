require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const db = require('./models');
const seedDatabase = require('./utils/seedData');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const { initializeRoles } = require('./utils/setup-db');

// Initialize Express app
const app = express();

// Отключение логирования SQL-запросов
db.sequelize.options.logging = false;

// Настройка CORS
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
};
app.use(cors(corsOptions));

// Парсинг запросов в формате JSON
app.use(express.json());

// Парсинг запросов с URL-encoded данными
app.use(express.urlencoded({ extended: true }));

// Использование cookie-parser
app.use(cookieParser());

// Подключение для обработки загруженных файлов
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Создание директории для загрузки аватарок, если она не существует
const uploadDir = path.join(__dirname, 'uploads/profile');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Проверка и создание директории для вложений задач
const taskAttachmentsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(taskAttachmentsDir)) {
  fs.mkdirSync(taskAttachmentsDir, { recursive: true });
}

// Статические файлы - закомментировано, так как директория dist не существует
// app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Простой маршрут для проверки
app.get('/', (req, res) => {
  res.json({ message: 'Добро пожаловать в API управления строительными проектами!' });
});

// Маршруты
require('./routes/auth.routes')(app);
require('./routes/user.routes')(app);
require('./routes/project.routes')(app);
require('./routes/task.routes')(app);
require('./routes/admin.routes')(app);

// Маршрут для всех остальных запросов - закомментирован, так как вызывает ошибку
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
// });

// Функция для пересоздания базы данных
async function resetDatabase() {
  try {
    await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
    await db.sequelize.sync({ force: true });
    await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
    const result = await seedDatabase();
    if (!result) {
      console.error("Database seeding failed");
    }
    return result;
  } catch (error) {
    console.error("Error resetting database:", error.message);
    return false;
  }
}

// Маршрут для пересоздания базы данных (защищенный, только для разработки)
if (process.env.NODE_ENV === 'development') {
  app.post('/api/reset-database', resetDatabase);
}

// Определение порта и запуск сервера
const PORT = process.env.PORT || 8080;

// Функция для синхронизации с базой данных и запуска сервера
async function startServer() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Синхронизация с базой данных
    await db.sequelize.sync();
    console.log('Database synchronized successfully.');
    
    // Заполнение базы тестовыми данными (если она пуста)
    const userCount = await db.user.count();
    if (userCount === 0) {
      console.log('Database is empty, seeding with test data...');
      await seedDatabase();
      console.log('Database seeded successfully.');
    }
    
    // Запуск сервера
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    await initializeRoles();
    console.log('Roles initialized');
  } catch (error) {
    console.error("Unable to start server:", error.message);
  }
}

// Запуск сервера
startServer();
