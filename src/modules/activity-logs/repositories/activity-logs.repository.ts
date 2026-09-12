import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { ActivityLog } from '../schemas/activity-log.schema.js';

export interface CreateActivityLogInput {
  userId: string;
  action: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ActivityLogsRepository {
  constructor(
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLog>,
  ) {}

  async create(data: CreateActivityLogInput): Promise<ActivityLog> {
    const created = await this.activityLogModel.create(data);
    return created.toObject();
  }

  async findById(id: string): Promise<ActivityLog | null> {
    return this.activityLogModel.findById(id).lean().exec();
  }

  /**
   * userId로 활동 로그 목록 조회 (최신순, 페이지네이션)
   * userId + createdAt 복합 인덱스를 그대로 활용한다.
   */
  async findByUserId(
    userId: string,
    params: { skip: number; limit: number },
  ): Promise<{ items: ActivityLog[]; total: number }> {
    const filter = { userId };

    const [items, total] = await Promise.all([
      this.activityLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(params.skip)
        .limit(params.limit)
        .lean()
        .exec(),
      this.activityLogModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }
}
