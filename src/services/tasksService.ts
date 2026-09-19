import { db } from '../db';
import type { Task } from '../types';
import { assertRequiredText } from '../utils/validation';
import { createCrudService, type EntityCreateInput, type EntityUpdateInput } from './localCrud';

export type CreateTaskInput = EntityCreateInput<Task>;
export type UpdateTaskInput = EntityUpdateInput<Task>;

async function validateTask(record: Task) {
  assertRequiredText(record.title, 'Título');
  assertRequiredText(record.status, 'Status');
  assertRequiredText(record.priority, 'Prioridade');
}

const baseTasksService = createCrudService<Task>({
  table: db.tasks as any,
  entityName: 'tasks',
  idPrefix: 'task',
  validate: validateTask,
});

export const tasksService = {
  ...baseTasksService,
};
