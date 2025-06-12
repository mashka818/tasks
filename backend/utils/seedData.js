const db = require('../models');
const argon2 = require('argon2');
const User = db.user;
const Role = db.role;
const Project = db.project;
const Task = db.task;

const seedDatabase = async () => {
  try {
    // 1. Создание ролей
    const roles = await Promise.all([
      Role.create({
        id: 1,
        name: "worker",
        description: "Обычный сотрудник компании"
      }),
      Role.create({
        id: 2,
        name: "manager",
        description: "Менеджер проектов"
      }),
      Role.create({
        id: 3,
        name: "admin",
        description: "Главный администратор"
      })
    ]);
    
    // 2. Создание пользователей
    const adminPassword = await argon2.hash('admin123');
    const admin = await User.create({
      username: "admin",
      email: "admin@example.com",
      password: adminPassword,
      fullName: "Администратор системы",
      position: "Главный администратор",
      phone: "+7 (999) 123-45-67"
    });
    await admin.setRoles([roles[2]]);
    
    const managerPassword = await argon2.hash('manager123');
    const manager = await User.create({
      username: "manager",
      email: "manager@example.com",
      password: managerPassword,
      fullName: "Иван Менеджеров",
      position: "Менеджер проектов",
      phone: "+7 (999) 234-56-78"
    });
    await manager.setRoles([roles[1]]);
    
    // Создаем несколько работников
    const worker1Password = await argon2.hash('worker123');
    const worker1 = await User.create({
      username: "worker1",
      email: "worker1@example.com",
      password: worker1Password,
      fullName: "Петр Работников",
      position: "Прораб",
      phone: "+7 (999) 345-67-89"
    });
    await worker1.setRoles([roles[0]]);
    
    const worker2Password = await argon2.hash('worker123');
    const worker2 = await User.create({
      username: "worker2",
      email: "worker2@example.com",
      password: worker2Password,
      fullName: "Алексей Строителев",
      position: "Каменщик",
      phone: "+7 (999) 456-78-90"
    });
    await worker2.setRoles([roles[0]]);
    
    const worker3Password = await argon2.hash('worker123');
    const worker3 = await User.create({
      username: "worker3",
      email: "worker3@example.com",
      password: worker3Password,
      fullName: "Сергей Монтажников",
      position: "Электрик",
      phone: "+7 (999) 567-89-01"
    });
    await worker3.setRoles([roles[0]]);
    
    // 3. Создание проектов
    const project1 = await Project.create({
      name: "Жилой комплекс 'Солнечный'",
      description: "Строительство жилого комплекса из трех 10-этажных домов с подземной парковкой",
      status: "active",
      startDate: "2023-01-15",
      endDate: "2024-06-30",
      location: "ул. Солнечная, 10",
      budget: 250000000,
      clientName: "ООО Инвестстрой",
      clientContact: "Иванов И.И., +7 (999) 111-22-33",
      managerId: manager.id
    });
    
    const project2 = await Project.create({
      name: "Торговый центр 'Меркурий'",
      description: "Строительство 3-этажного торгового центра с площадью 5000 кв.м.",
      status: "active",
      startDate: "2023-03-01",
      endDate: "2023-12-15",
      location: "пр. Ленина, 25",
      budget: 120000000,
      clientName: "ЗАО ТоргИнвест",
      clientContact: "Петров П.П., +7 (999) 222-33-44",
      managerId: manager.id
    });
    
    const project3 = await Project.create({
      name: "Офисный центр 'Бизнес Плаза'",
      description: "Реконструкция существующего здания под офисный центр класса B+",
      status: "on_hold",
      startDate: "2023-02-10",
      endDate: "2023-10-20",
      location: "ул. Промышленная, 5",
      budget: 85000000,
      clientName: "ООО Бизнес Девелопмент",
      clientContact: "Сидоров С.С., +7 (999) 333-44-55",
      managerId: manager.id
    });
    
    // 4. Создание задач
    // Задачи для проекта 1
    await Task.create({
      title: "Подготовка строительной площадки",
      description: "Очистка территории, вывоз мусора, установка ограждения",
      status: "completed",
      priority: "high",
      startDate: "2023-01-15",
      dueDate: "2023-01-25",
      completedDate: "2023-01-23",
      estimatedHours: 80,
      actualHours: 75,
      projectId: project1.id,
      assigneeId: worker1.id
    });
    
    await Task.create({
      title: "Земляные работы",
      description: "Рытье котлована под фундамент, вывоз грунта",
      status: "completed",
      priority: "high",
      startDate: "2023-01-26",
      dueDate: "2023-02-15",
      completedDate: "2023-02-14",
      estimatedHours: 160,
      actualHours: 155,
      projectId: project1.id,
      assigneeId: worker1.id
    });
    
    await Task.create({
      title: "Заливка фундамента",
      description: "Установка опалубки, армирование, заливка бетона",
      status: "in_progress",
      priority: "high",
      startDate: "2023-02-16",
      dueDate: "2023-03-15",
      estimatedHours: 240,
      projectId: project1.id,
      assigneeId: worker2.id
    });
    
    await Task.create({
      title: "Монтаж электропроводки в подземной парковке",
      description: "Прокладка кабелей, установка распределительных щитов",
      status: "planned",
      priority: "medium",
      startDate: "2023-05-01",
      dueDate: "2023-05-30",
      estimatedHours: 160,
      projectId: project1.id,
      assigneeId: worker3.id
    });
    
    // Задачи для проекта 2
    await Task.create({
      title: "Подготовка строительной площадки",
      description: "Очистка территории, установка ограждения и временных сооружений",
      status: "completed",
      priority: "high",
      startDate: "2023-03-01",
      dueDate: "2023-03-10",
      completedDate: "2023-03-09",
      estimatedHours: 40,
      actualHours: 38,
      projectId: project2.id,
      assigneeId: worker1.id
    });
    
    await Task.create({
      title: "Земляные работы и заливка фундамента",
      description: "Рытье котлована, установка опалубки, армирование, заливка бетона",
      status: "in_progress",
      priority: "high",
      startDate: "2023-03-11",
      dueDate: "2023-04-10",
      estimatedHours: 200,
      projectId: project2.id,
      assigneeId: worker2.id
    });
    
    await Task.create({
      title: "Проектирование электрических сетей",
      description: "Разработка схем электроснабжения, выбор оборудования",
      status: "planned",
      priority: "medium",
      startDate: "2023-04-15",
      dueDate: "2023-05-15",
      estimatedHours: 120,
      projectId: project2.id,
      assigneeId: worker3.id
    });
    
    // Задачи для проекта 3
    await Task.create({
      title: "Демонтажные работы",
      description: "Демонтаж старых перегородок, полов, сантехники",
      status: "completed",
      priority: "high",
      startDate: "2023-02-10",
      dueDate: "2023-02-28",
      completedDate: "2023-02-25",
      estimatedHours: 80,
      actualHours: 75,
      projectId: project3.id,
      assigneeId: worker1.id
    });
    
    await Task.create({
      title: "Усиление несущих конструкций",
      description: "Усиление фундамента и несущих стен",
      status: "in_progress",
      priority: "high",
      startDate: "2023-03-01",
      dueDate: "2023-03-30",
      estimatedHours: 160,
      projectId: project3.id,
      assigneeId: worker2.id
    });
    
    await Task.create({
      title: "Монтаж электропроводки",
      description: "Прокладка новой электропроводки, установка щитов и розеток",
      status: "planned",
      priority: "medium",
      startDate: "2023-04-01",
      dueDate: "2023-04-30",
      estimatedHours: 120,
      projectId: project3.id,
      assigneeId: worker3.id
    });
    
    return true;
  } catch (error) {
    console.error(error.message);
    return false;
  }
};

module.exports = seedDatabase; 