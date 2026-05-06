import type { DataSource, EntityManager, QueryRunner } from 'typeorm';

export class DbContext {
  private queryRunner: QueryRunner | null = null;

  constructor(private readonly dataSource: DataSource) {}

  get manager(): EntityManager {
    return this.queryRunner?.manager ?? this.dataSource.manager;
  }

  get isInTransaction(): boolean {
    return this.queryRunner?.isTransactionActive ?? false;
  }

  async beginTransaction(): Promise<void> {
    if (this.queryRunner) {
      throw new Error('transaction already started');
    }

    this.queryRunner = this.dataSource.createQueryRunner();
    await this.queryRunner.connect();
    await this.queryRunner.startTransaction();
  }

  async commit(): Promise<void> {
    if (this.queryRunner?.isTransactionActive) {
      await this.queryRunner.commitTransaction();
    }
  }

  async rollback(): Promise<void> {
    if (this.queryRunner?.isTransactionActive) {
      await this.queryRunner.rollbackTransaction();
    }
  }

  async release(): Promise<void> {
    await this.queryRunner?.release();
    this.queryRunner = null;
  }
}

