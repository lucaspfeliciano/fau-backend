import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { DomainEventsService } from '../common/events/domain-events.service';
import { FeatureStatus } from '../product/entities/feature-status.enum';
import { ProductService } from '../product/product.service';
import type { CreateSprintInput } from './dto/create-sprint.schema';
import type { CreateTaskInput } from './dto/create-task.schema';
import type { QuerySprintsInput } from './dto/query-sprints.schema';
import type { QueryTasksInput } from './dto/query-tasks.schema';
import type { UpdateSprintInput } from './dto/update-sprint.schema';
import type { UpdateTaskInput } from './dto/update-task.schema';
import { SprintStatus } from './entities/sprint-status.enum';
import type { SprintEntity } from './entities/sprint.entity';
import { TaskStatus } from './entities/task-status.enum';
import type { TaskEntity } from './entities/task.entity';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SprintProgressResult {
  sprint: SprintEntity;
  totals: {
    totalTasks: number;
    todoTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    doneTasks: number;
    completionRate: number;
  };
}

export interface TaskTraceabilityResult {
  task: TaskEntity;
  traceability: ReturnType<ProductService['getFeatureTraceability']>;
}

@Injectable()
export class EngineeringService {
  private readonly sprints: SprintEntity[] = [];
  private readonly tasks: TaskEntity[] = [];

  constructor(
    private readonly domainEventsService: DomainEventsService,
    private readonly productService: ProductService,
  ) {}

  createSprint(
    input: CreateSprintInput,
    actor: AuthenticatedUser,
  ): SprintEntity {
    this.ensureSprintDates(input.startDate, input.endDate);

    const now = new Date().toISOString();
    const status = input.status ?? SprintStatus.Planned;

    const sprint: SprintEntity = {
      id: randomUUID(),
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      status,
      organizationId: actor.organizationId,
      createdBy: actor.id,
      statusHistory: [
        {
          from: null,
          to: status,
          changedBy: actor.id,
          changedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    this.sprints.push(sprint);

    this.domainEventsService.publish({
      name: 'engineering.sprint_created',
      occurredAt: now,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        sprintId: sprint.id,
        status: sprint.status,
      },
    });

    return sprint;
  }

  listSprints(
    query: QuerySprintsInput,
    organizationId: string,
  ): PaginatedResult<SprintEntity> {
    const filtered = this.sprints
      .filter((sprint) => sprint.organizationId === organizationId)
      .filter((sprint) => {
        if (!query.status) {
          return true;
        }

        return sprint.status === query.status;
      })
      .filter((sprint) => {
        if (!query.search) {
          return true;
        }

        return sprint.name.toLowerCase().includes(query.search.toLowerCase());
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return this.paginate(filtered, query.page, query.limit);
  }

  updateSprint(
    sprintId: string,
    input: UpdateSprintInput,
    actor: AuthenticatedUser,
  ): SprintEntity {
    const sprint = this.findSprintById(sprintId, actor.organizationId);
    const previousStatus = sprint.status;

    const nextStartDate = input.startDate ?? sprint.startDate;
    const nextEndDate = input.endDate ?? sprint.endDate;
    this.ensureSprintDates(nextStartDate, nextEndDate);

    if (input.name !== undefined) {
      sprint.name = input.name;
    }

    if (input.startDate !== undefined) {
      sprint.startDate = input.startDate;
    }

    if (input.endDate !== undefined) {
      sprint.endDate = input.endDate;
    }

    if (input.status !== undefined && input.status !== sprint.status) {
      if (input.status === SprintStatus.Completed) {
        const openTasks = this.tasks.filter(
          (task) =>
            task.organizationId === actor.organizationId &&
            task.sprintId === sprint.id &&
            task.status !== TaskStatus.Done,
        );

        if (openTasks.length > 0 && !input.closeReason) {
          throw new BadRequestException(
            'Sprint cannot be completed with open tasks without closeReason.',
          );
        }
      }

      sprint.status = input.status;
      sprint.statusHistory.push({
        from: previousStatus,
        to: input.status,
        changedBy: actor.id,
        changedAt: new Date().toISOString(),
        reason: input.closeReason,
      });

      if (input.status === SprintStatus.Completed && input.closeReason) {
        sprint.closeReason = input.closeReason;
      }

      this.domainEventsService.publish({
        name: 'engineering.sprint_status_changed',
        occurredAt: new Date().toISOString(),
        actorId: actor.id,
        organizationId: actor.organizationId,
        payload: {
          sprintId: sprint.id,
          from: previousStatus,
          to: input.status,
          closeReason: input.closeReason,
        },
      });
    }

    sprint.updatedAt = new Date().toISOString();

    this.domainEventsService.publish({
      name: 'engineering.sprint_updated',
      occurredAt: sprint.updatedAt,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        sprintId: sprint.id,
      },
    });

    return sprint;
  }

  createTask(input: CreateTaskInput, actor: AuthenticatedUser): TaskEntity {
    const feature = this.productService.findFeatureById(
      input.featureId,
      actor.organizationId,
    );

    if (input.sprintId) {
      this.findSprintById(input.sprintId, actor.organizationId);
    }

    const now = new Date().toISOString();
    const status = input.status ?? TaskStatus.Todo;

    const task: TaskEntity = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      featureId: feature.id,
      sprintId: input.sprintId,
      status,
      estimate: input.estimate,
      requestSources: feature.requestSources,
      organizationId: actor.organizationId,
      createdBy: actor.id,
      statusHistory: [
        {
          from: null,
          to: status,
          changedBy: actor.id,
          changedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.push(task);

    this.domainEventsService.publish({
      name: 'engineering.task_created',
      occurredAt: now,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        taskId: task.id,
        featureId: task.featureId,
        sprintId: task.sprintId,
        status: task.status,
      },
    });

    this.syncFeatureExecutionStatus(task.featureId, actor);

    return task;
  }

  listTasks(
    query: QueryTasksInput,
    organizationId: string,
  ): PaginatedResult<TaskEntity> {
    const filtered = this.tasks
      .filter((task) => task.organizationId === organizationId)
      .filter((task) => {
        if (!query.status) {
          return true;
        }

        return task.status === query.status;
      })
      .filter((task) => {
        if (!query.sprintId) {
          return true;
        }

        return task.sprintId === query.sprintId;
      })
      .filter((task) => {
        if (!query.featureId) {
          return true;
        }

        return task.featureId === query.featureId;
      })
      .filter((task) => {
        if (!query.search) {
          return true;
        }

        const search = query.search.toLowerCase();
        return (
          task.title.toLowerCase().includes(search) ||
          task.description.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return this.paginate(filtered, query.page, query.limit);
  }

  updateTask(
    taskId: string,
    input: UpdateTaskInput,
    actor: AuthenticatedUser,
  ): TaskEntity {
    const task = this.findTaskById(taskId, actor.organizationId);
    const previousStatus = task.status;
    const previousFeatureId = task.featureId;

    if (input.title !== undefined) {
      task.title = input.title;
    }

    if (input.description !== undefined) {
      task.description = input.description;
    }

    if (input.estimate !== undefined) {
      task.estimate = input.estimate;
    }

    if (input.featureId !== undefined) {
      const feature = this.productService.findFeatureById(
        input.featureId,
        actor.organizationId,
      );
      task.featureId = feature.id;
      task.requestSources = feature.requestSources;
    }

    if (input.sprintId !== undefined) {
      if (input.sprintId === null) {
        task.sprintId = undefined;
      } else {
        this.findSprintById(input.sprintId, actor.organizationId);
        task.sprintId = input.sprintId;
      }
    }

    if (input.status !== undefined && input.status !== task.status) {
      task.status = input.status;
      task.statusHistory.push({
        from: previousStatus,
        to: input.status,
        changedBy: actor.id,
        changedAt: new Date().toISOString(),
      });

      this.domainEventsService.publish({
        name: 'engineering.task_status_changed',
        occurredAt: new Date().toISOString(),
        actorId: actor.id,
        organizationId: actor.organizationId,
        payload: {
          taskId: task.id,
          featureId: task.featureId,
          from: previousStatus,
          to: input.status,
        },
      });
    }

    task.updatedAt = new Date().toISOString();

    this.domainEventsService.publish({
      name: 'engineering.task_updated',
      occurredAt: task.updatedAt,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        taskId: task.id,
      },
    });

    this.syncFeatureExecutionStatus(previousFeatureId, actor);
    if (previousFeatureId !== task.featureId) {
      this.syncFeatureExecutionStatus(task.featureId, actor);
    }

    return task;
  }

  assignTaskToSprint(
    taskId: string,
    sprintId: string,
    actor: AuthenticatedUser,
  ): TaskEntity {
    this.findSprintById(sprintId, actor.organizationId);

    return this.updateTask(
      taskId,
      {
        sprintId,
      },
      actor,
    );
  }

  getSprintProgress(
    sprintId: string,
    organizationId: string,
  ): SprintProgressResult {
    const sprint = this.findSprintById(sprintId, organizationId);
    const sprintTasks = this.tasks.filter(
      (task) =>
        task.organizationId === organizationId && task.sprintId === sprint.id,
    );

    return {
      sprint,
      totals: this.calculateTaskTotals(sprintTasks),
    };
  }

  getTaskTraceability(
    taskId: string,
    organizationId: string,
  ): TaskTraceabilityResult {
    const task = this.findTaskById(taskId, organizationId);
    const traceability = this.productService.getFeatureTraceability(
      task.featureId,
      organizationId,
    );

    return {
      task,
      traceability,
    };
  }

  private syncFeatureExecutionStatus(
    featureId: string,
    actor: AuthenticatedUser,
  ): void {
    const featureTasks = this.tasks.filter(
      (task) =>
        task.organizationId === actor.organizationId &&
        task.featureId === featureId,
    );

    if (featureTasks.length === 0) {
      return;
    }

    const totals = this.calculateTaskTotals(featureTasks);
    let nextFeatureStatus: FeatureStatus;

    if (totals.doneTasks === totals.totalTasks) {
      nextFeatureStatus = FeatureStatus.Done;
    } else if (totals.inProgressTasks > 0 || totals.blockedTasks > 0) {
      nextFeatureStatus = FeatureStatus.InProgress;
    } else {
      nextFeatureStatus = FeatureStatus.Planned;
    }

    this.productService.updateFeature(
      featureId,
      {
        status: nextFeatureStatus,
      },
      actor,
    );
  }

  private calculateTaskTotals(tasks: TaskEntity[]) {
    const totalTasks = tasks.length;
    const todoTasks = tasks.filter(
      (task) => task.status === TaskStatus.Todo,
    ).length;
    const inProgressTasks = tasks.filter(
      (task) => task.status === TaskStatus.InProgress,
    ).length;
    const blockedTasks = tasks.filter(
      (task) => task.status === TaskStatus.Blocked,
    ).length;
    const doneTasks = tasks.filter(
      (task) => task.status === TaskStatus.Done,
    ).length;

    return {
      totalTasks,
      todoTasks,
      inProgressTasks,
      blockedTasks,
      doneTasks,
      completionRate:
        totalTasks === 0
          ? 0
          : Number(((doneTasks / totalTasks) * 100).toFixed(2)),
    };
  }

  private findSprintById(
    sprintId: string,
    organizationId: string,
  ): SprintEntity {
    const sprint = this.sprints.find(
      (item) => item.id === sprintId && item.organizationId === organizationId,
    );

    if (!sprint) {
      throw new NotFoundException('Sprint not found.');
    }

    return sprint;
  }

  private findTaskById(taskId: string, organizationId: string): TaskEntity {
    const task = this.tasks.find(
      (item) => item.id === taskId && item.organizationId === organizationId,
    );

    if (!task) {
      throw new NotFoundException('Task not found.');
    }

    return task;
  }

  private ensureSprintDates(startDate: string, endDate: string): void {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid sprint dates.');
    }

    if (start > end) {
      throw new BadRequestException(
        'Sprint startDate must be before or equal to endDate.',
      );
    }
  }

  private paginate<T>(
    items: T[],
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    const total = items.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    return {
      items: items.slice(offset, offset + limit),
      page,
      limit,
      total,
      totalPages,
    };
  }
}
