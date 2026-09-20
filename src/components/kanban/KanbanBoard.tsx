import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { Task } from '../../types';
import { tasksService } from '../../services/tasksService';
import { TaskCard } from './TaskCard';

interface KanbanBoardProps {
  membersMap: Record<string, string>;
  isAdmin: boolean;
  tasks: Task[];
  onTasksChange: () => void;
}

const COLUMNS = [
  { id: 'todo', title: 'A fazer' },
  { id: 'doing', title: 'Fazendo' },
  { id: 'waiting', title: 'Aguardando' },
  { id: 'done', title: 'Feito' },
];

export function KanbanBoard({ tasks, onTasksChange, membersMap, isAdmin }: KanbanBoardProps) {
  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId !== destination.droppableId) {
      const task = tasks.find((t) => t.id === draggableId);
      if (task) {
        await tasksService.update(task.id, { status: destination.droppableId });
        onTasksChange();
      }
    }
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-full min-h-[70vh]">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);

          return (
            <div key={col.id} className="flex-1 min-w-[280px] bg-slate-100 rounded-lg flex flex-col">
              <div className="p-3 border-b border-slate-200">
                <h3 className="font-semibold text-slate-700">{col.title}</h3>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-2 ${snapshot.isDraggingOver ? 'bg-slate-200' : ''}`}
                  >
                    {colTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-2 ${snapshot.isDragging ? 'opacity-50' : ''}`}
                          >
                            <TaskCard task={task} onTasksChange={onTasksChange} membersMap={membersMap} isAdmin={isAdmin} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
