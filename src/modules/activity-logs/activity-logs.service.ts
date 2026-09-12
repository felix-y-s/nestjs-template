import { Injectable, NotFoundException } from '@nestjs/common';
import type { ActivityLog } from './schemas/activity-log.schema.js';
import {
  PaginationUtil,
  type PaginatedResult,
  type PaginationOptions,
} from '../../common/pagination/index.js';
import { CreateActivityLogDto } from './dto/create-activity-log.dto.js';
import { ActivityLogsRepository } from './repositories/activity-logs.repository.js';

@Injectable()
export class ActivityLogsService {
  constructor(private readonly activityLogsRepository: ActivityLogsRepository) {}

  async record(
    userId: string,
    dto: CreateActivityLogDto,
  ): Promise<ActivityLog> {
    return this.activityLogsRepository.create({
      userId,
      action: dto.action,
      metadata: dto.metadata,
    });
  }

  async findByUserId(
    userId: string,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<ActivityLog>> {
    const options = PaginationUtil.normalize(pagination);
    const { skip, limit } = PaginationUtil.getMongoOptions(options);

    const { items, total } = await this.activityLogsRepository.findByUserId(
      userId,
      { skip, limit },
    );

    return PaginationUtil.paginate(items, total, options);
  }

  async findOne(id: string): Promise<ActivityLog> {
    const log = await this.activityLogsRepository.findById(id);
    if (!log) {
      throw new NotFoundException('활동 로그를 찾을 수 없습니다');
    }
    return log;
  }
}
