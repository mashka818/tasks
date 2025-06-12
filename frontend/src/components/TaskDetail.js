import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Form, Button, ListGroup, Alert, Modal, Image } from 'react-bootstrap';
import { toast } from 'react-toastify';
import TaskService from '../services/task.service';
import AuthService from '../services/auth.service';

const TaskDetail = ({ task, onTaskUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [actualHours, setActualHours] = useState(task.actualHours || 0);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [attachmentsList, setAttachmentsList] = useState([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const currentUser = AuthService.getCurrentUser();
  const isTaskAssignee = task.assigneeId === currentUser.id;
  
  // Получаем базовый URL сервера (без /api в конце)
  const baseUrl = "http://localhost:8080";
  
  // Функция для формирования URL к файлу
  const getFileUrl = (filePath) => {
    if (!filePath) return '';
    
    // Извлекаем имя файла из пути, обрабатывая как слэши, так и обратные слэши
    let fileName = filePath;
    
    // Удаляем префикс 'uploads/' или 'uploads\\'
    if (fileName.startsWith('uploads/') || fileName.startsWith('uploads\\')) {
      fileName = fileName.replace(/^uploads[/\\]/, '');
    }
    
    return `${baseUrl}/uploads/${fileName}`;
  };
  
  useEffect(() => {
    // Преобразуем attachments из JSON в массив, если нужно
    if (task.attachments) {
      try {
        let attachments = task.attachments;
        if (typeof attachments === 'string') {
          attachments = JSON.parse(attachments);
        }
        setAttachmentsList(Array.isArray(attachments) ? attachments : []);
      } catch (err) {
        console.error('Error parsing attachments:', err);
        setAttachmentsList([]);
      }
    } else {
      setAttachmentsList([]);
    }
  }, [task.attachments]);

  // Обновление фактических часов
  const handleActualHoursChange = (e) => {
    setActualHours(e.target.value);
  };

  const handleActualHoursSubmit = async () => {
    if (actualHours < 0) {
      toast.error('Фактические часы не могут быть отрицательными');
      return;
    }

    try {
      setLoading(true);
      const response = await TaskService.updateActualHours(task.id, parseFloat(actualHours));
      toast.success('Фактические часы обновлены');
      if (onTaskUpdate) {
        onTaskUpdate();
      }
    } catch (err) {
      toast.error('Ошибка при обновлении фактических часов');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Добавление комментария
  const handleCommentChange = (e) => {
    setComment(e.target.value);
  };

  const handleCommentSubmit = async () => {
    if (!comment.trim()) {
      toast.error('Комментарий не может быть пустым');
      return;
    }

    try {
      setLoading(true);
      const response = await TaskService.addComment(task.id, comment);
      toast.success('Комментарий добавлен');
      setComment('');
      if (onTaskUpdate) {
        onTaskUpdate();
      }
    } catch (err) {
      toast.error('Ошибка при добавлении комментария');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Добавление вложения
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleAttachmentSubmit = async () => {
    if (!selectedFile) {
      toast.error('Выберите файл для загрузки');
      return;
    }

    try {
      setLoading(true);
      const response = await TaskService.addAttachment(task.id, selectedFile);
      toast.success('Вложение добавлено');
      setSelectedFile(null);
      setShowAttachmentModal(false);
      if (onTaskUpdate) {
        onTaskUpdate();
      }
    } catch (err) {
      toast.error('Ошибка при загрузке вложения');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Проверка, является ли файл изображением
  const isImageFile = (fileName) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const extension = fileName.split('.').pop().toLowerCase();
    return imageExtensions.includes(extension);
  };
  
  // Открыть изображение в модальном окне
  const openImageViewer = (attachment) => {
    setSelectedImage(attachment);
    setShowImageModal(true);
  };

  // Форматирование статуса задачи
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge bg="success">Завершено</Badge>;
      case 'in_progress':
        return <Badge bg="primary">В процессе</Badge>;
      case 'planned':
        return <Badge bg="warning">Запланировано</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  // Форматирование приоритета задачи
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return <Badge bg="danger">Высокий</Badge>;
      case 'medium':
        return <Badge bg="warning">Средний</Badge>;
      case 'low':
        return <Badge bg="success">Низкий</Badge>;
      default:
        return <Badge bg="info">{priority}</Badge>;
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header as="h5">{task.title}</Card.Header>
      <Card.Body>
        <Row className="mb-3">
          <Col md={6}>
            <p><strong>Статус:</strong> {getStatusBadge(task.status)}</p>
            <p><strong>Приоритет:</strong> {getPriorityBadge(task.priority)}</p>
            <p><strong>Дата начала:</strong> {task.startDate ? new Date(task.startDate).toLocaleDateString() : 'Не указана'}</p>
            <p><strong>Дата завершения:</strong> {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Не указана'}</p>
          </Col>
          <Col md={6}>
            <p><strong>Проект:</strong> {task.project ? task.project.name : 'Не указан'}</p>
            <p><strong>Исполнитель:</strong> {task.assignee ? task.assignee.fullName : 'Не назначен'}</p>
            <p><strong>Плановые часы:</strong> {task.estimatedHours || 'Не указаны'}</p>
            <p><strong>Фактические часы:</strong> {task.actualHours || 0}</p>
          </Col>
        </Row>

        <Card.Text className="mb-4">
          <strong>Описание:</strong><br/>
          {task.description || 'Нет описания'}
        </Card.Text>

        {isTaskAssignee && (
          <>
            <h5 className="mt-4">Фактические часы работы</h5>
            <Row className="mb-4">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Укажите фактические часы работы над задачей</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.5"
                    value={actualHours}
                    onChange={handleActualHoursChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6} className="d-flex align-items-end">
                <Button
                  variant="primary"
                  onClick={handleActualHoursSubmit}
                  disabled={loading}
                >
                  Сохранить
                </Button>
              </Col>
            </Row>

            <h5 className="mt-4">Добавить комментарий</h5>
            <Form.Group className="mb-3">
              <Form.Control
                as="textarea"
                rows={3}
                value={comment}
                onChange={handleCommentChange}
                placeholder="Введите ваш комментарий..."
              />
            </Form.Group>
            <Button
              variant="primary"
              onClick={handleCommentSubmit}
              disabled={loading || !comment.trim()}
              className="mb-4"
            >
              Добавить комментарий
            </Button>

            <h5 className="mt-4">Вложения</h5>
            <Button
              variant="outline-primary"
              onClick={() => setShowAttachmentModal(true)}
              className="mb-3"
            >
              Добавить вложение
            </Button>
          </>
        )}

        {/* Отображение списка вложений */}
        {attachmentsList.length > 0 ? (
          <ListGroup className="mb-4">
            {attachmentsList.map(attachment => (
              <ListGroup.Item key={attachment.id} className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>{attachment.fileName}</strong>
                  <br />
                  <small className="text-muted">
                    {attachment.uploadDate ? new Date(attachment.uploadDate).toLocaleString() : 'Загружено'}
                  </small>
                </div>
                <div>
                  {isImageFile(attachment.fileName) ? (
                    <>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="me-2"
                        onClick={() => openImageViewer(attachment)}
                      >
                        Просмотр
                      </Button>
                      <Button 
                        variant="outline-info" 
                        size="sm" 
                        as="a" 
                        href={getFileUrl(attachment.filePath)} 
                        target="_blank"
                      >
                        Скачать
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="outline-info" 
                      size="sm" 
                      as="a" 
                      href={getFileUrl(attachment.filePath)} 
                      target="_blank"
                    >
                      Открыть
                    </Button>
                  )}
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : (
          <Alert variant="info" className="mb-4">
            Для этой задачи нет вложений
          </Alert>
        )}

        {/* Отображение комментариев */}
        <h5 className="mt-4">Комментарии</h5>
        {task.notes ? (
          <Card className="mb-4">
            <Card.Body>
              <pre className="notes-pre">{task.notes}</pre>
            </Card.Body>
          </Card>
        ) : (
          <Alert variant="info">
            Для этой задачи пока нет комментариев
          </Alert>
        )}

        {/* Модальное окно для добавления вложения */}
        <Modal show={showAttachmentModal} onHide={() => setShowAttachmentModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Добавить вложение</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group>
              <Form.Label>Выберите файл для загрузки</Form.Label>
              <Form.Control
                type="file"
                onChange={handleFileChange}
              />
              <Form.Text className="text-muted">
                Максимальный размер файла - 10 МБ
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAttachmentModal(false)}>
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={handleAttachmentSubmit}
              disabled={loading || !selectedFile}
            >
              Загрузить
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Модальное окно для просмотра изображений */}
        <Modal 
          show={showImageModal} 
          onHide={() => setShowImageModal(false)} 
          size="lg" 
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>{selectedImage?.fileName}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center">
            {selectedImage && (
              <Image 
                src={getFileUrl(selectedImage.filePath)} 
                fluid 
                className="img-viewer"
              />
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="primary" 
              as="a" 
              href={getFileUrl(selectedImage?.filePath)} 
              target="_blank"
              download
            >
              Скачать
            </Button>
            <Button variant="secondary" onClick={() => setShowImageModal(false)}>
              Закрыть
            </Button>
          </Modal.Footer>
        </Modal>
      </Card.Body>
    </Card>
  );
};

export default TaskDetail; 