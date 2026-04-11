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
import { SprintsRepository } from './repositories/sprints.repository';
import { TasksRepository } from './repositories/tasks.repository';

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
  traceability: Awaited<ReturnType<ProductService['getFeatureTraceability']>>;
}

@Injectable()
export class EngineeringService {
  constructor(
    private readonly domainEventsService: DomainEventsService,
    private readonly productService: ProductService,
    private readonly sprintsRepository: SprintsRepository,
    private readonly tasksRepository: TasksRepository,
  ) {}

  async createSprint(
    input: CreateSprintInput,
    actor: AuthenticatedUser,
  ): Promise<SprintEntity> {
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

    await this.sprintsRepository.insert(sprint);

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

  async listSprints(
    query: QuerySprintsInput,
    organizationId: string,
  ): Promise<PaginatedResult<SprintEntity>> {
    const sprints =
      await this.sprintsRepository.listByOrganization(organizationId);

    const filtered = sprints
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

  async updateSprint(
    sprintId: string,
    input: UpdateSprintInput,
    actor: AuthenticatedUser,
  ): Promise<SprintEntity> {
    const sprint = await this.findSprintById(sprintId, actor.organizationId);
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
        const tasks = await this.tasksRepository.listByOrganization(
          actor.organizationId,
        );
        const openTasks = tasks.filter(
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
    await this.sprintsRepository.update(sprint);

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

  async createTask(
    input: CreateTaskInput,
    actor: AuthenticatedUser,
  ): Promise<TaskEntity> {
    const feature = await this.productService.findFeatureById(
      input.featureId,
      actor.organizationId,
    );

    if (input.sprintId) {
      await this.findSprintById(input.sprintId, actor.organizationId);
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

    await this.tasksRepository.insert(task);

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

    await this.syncFeatureExecutionStatus(task.featureId, actor);

    return task;
  }

  async listTasks(
    query: QueryTasksInput,
    organizationId: string,
  ): Promise<PaginatedResult<TaskEntity>> {
    const tasks = await this.tasksRepository.listByOrganization(organizationId);

    const filtered = tasks
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

  async updateTask(
    taskId: string,
    input: UpdateTaskInput,
    actor: AuthenticatedUser,
  ): Promise<TaskEntity> {
    const task = await this.findTaskById(taskId, actor.organizationId);
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
      const feature = await this.productService.findFeatureById(
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
        await this.findSprintById(input.sprintId, actor.organizationId);
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
    await this.tasksRepository.update(task);

    this.domainEventsService.publish({
      name: 'engineering.task_updated',
      occurredAt: task.updatedAt,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        taskId: task.id,
      },
    });

    await this.syncFeatureExecutionStatus(previousFeatureId, actor);
    if (previousFeatureId !== task.featureId) {
      await this.syncFeatureExecutionStatus(task.featureId, actor);
    }

    return task;
  }

  async assignTaskToSprint(
    taskId: string,
    sprintId: string,
    actor: AuthenticatedUser,
  ): Promise<TaskEntity> {
    await this.findSprintById(sprintId, actor.organizationId);

    return this.updateTask(
      taskId,
      {
        sprintId,
      },
      actor,
    );
  }

  async getSprintProgress(
    sprintId: string,
    organizationId: string,
  ): Promise<SprintProgressResult> {
    const sprint = await this.findSprintById(sprintId, organizationId);
    const tasks = await this.tasksRepository.listByOrganization(organizationId);
    const sprintTasks = tasks.filter(
      (task) =>
        task.organizationId === organizationId && task.sprintId === sprint.id,
    );

    return {
      sprint,
      totals: this.calculateTaskTotals(sprintTasks),
    };
  }

  async getTaskTraceability(
    taskId: string,
    organizationId: string,
  ): Promise<TaskTraceabilityResult> {
    const task = await this.findTaskById(taskId, organizationId);
    const traceability = await this.productService.getFeatureTraceability(
      task.featureId,
      organizationId,
    );

    return {
      task,
      traceability,
    };
  }

  async getTaskById(
    taskId: string,
    organizationId: string,
  ): Promise<TaskEntity> {
    return this.findTaskById(taskId, organizationId);
  }

  private async syncFeatureExecutionStatus(
    featureId: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const tasks = await this.tasksRepository.listByOrganization(
      actor.organizationId,
    );

    const featureTasks = tasks.filter(
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

    await this.productService.updateFeature(
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
  ): Promise<SprintEntity> {
    return this.findSprintByIdOrFail(sprintId, organizationId);
  }

  private async findSprintByIdOrFail(
    sprintId: string,
    organizationId: string,
  ): Promise<SprintEntity> {
    const sprint = await this.sprintsRepository.findById(
      sprintId,
      organizationId,
    );

    if (!sprint) {
      throw new NotFoundException('Sprint not found.');
    }

    return sprint;
  }

  private async findTaskById(
    taskId: string,
    organizationId: string,
  ): Promise<TaskEntity> {
    const task = await this.tasksRepository.findById(taskId, organizationId);

    if (!task) {
      throw new NotFoundException('Task not found.');
    }

    return task;
  }

  private async listTasksByOrganization(
    organizationId: string,
  ): Promise<TaskEntity[]> {
    return this.tasksRepository.listByOrganization(organizationId);
  }

  private async listSprintsByOrganization(
    organizationId: string,
  ): Promise<SprintEntity[]> {
    return this.sprintsRepository.listByOrganization(organizationId);
  }

  private async filterOpenTasksForSprint(
    sprintId: string,
    organizationId: string,
  ): Promise<TaskEntity[]> {
    const tasks = await this.listTasksByOrganization(organizationId);
    return tasks.filter(
      (task) =>
        task.organizationId === organizationId &&
        task.sprintId === sprintId &&
        task.status !== TaskStatus.Done,
    );
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
