import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecipeProcessingClaim1791280000000 implements MigrationInterface {
  name = 'AddRecipeProcessingClaim1791280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recipes" ADD "processing_job_id" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipes" ADD "processing_token" uuid`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recipes" DROP COLUMN "processing_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipes" DROP COLUMN "processing_job_id"`,
    );
  }
}
