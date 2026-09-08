import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1788879733493 implements MigrationInterface {
  name = 'CreateInitialSchema1788879733493';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "email" character varying(320) NOT NULL, "password_hash" character varying(255) NOT NULL, "name" character varying(120) NOT NULL, "language" character varying(10) NOT NULL DEFAULT 'en', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_users_email" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "recipe_steps" ("id" SERIAL NOT NULL, "text" text NOT NULL, "group_name" character varying(255), "duration_minutes" integer, "image_url" text, "position" integer NOT NULL, "recipe_id" integer NOT NULL, CONSTRAINT "UQ_recipe_steps_recipe_id_position" UNIQUE ("recipe_id", "position"), CONSTRAINT "PK_6fa74d528684e8dc16bfe8582f2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."recipe_status" AS ENUM('pending', 'processing', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "recipes" ("id" SERIAL NOT NULL, "title" character varying(255), "description" text, "source_url" text NOT NULL, "image_url" text, "servings" integer, "prep_time_minutes" integer, "cook_time_minutes" integer, "status" "public"."recipe_status" NOT NULL DEFAULT 'pending', "error_message" text, "user_id" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8f09680a51bf3669c1598a21682" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_recipes_user_id" ON "recipes"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "recipe_ingredients" ("id" SERIAL NOT NULL, "raw_text" text NOT NULL, "name" character varying(255), "quantity" double precision, "unit" character varying(32), "position" integer NOT NULL, "recipe_id" integer NOT NULL, CONSTRAINT "UQ_recipe_ingredients_recipe_id_position" UNIQUE ("recipe_id", "position"), CONSTRAINT "PK_8f15a314e55970414fc92ffb532" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipe_steps" ADD CONSTRAINT "FK_38ada029d0ae403b4d552c88527" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipes" ADD CONSTRAINT "FK_67d98fd6ff56c4340a811402154" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "FK_f240137e0e13bed80bdf64fed53" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "FK_f240137e0e13bed80bdf64fed53"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipes" DROP CONSTRAINT "FK_67d98fd6ff56c4340a811402154"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipe_steps" DROP CONSTRAINT "FK_38ada029d0ae403b4d552c88527"`,
    );
    await queryRunner.query(`DROP TABLE "recipe_ingredients"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_recipes_user_id"`);
    await queryRunner.query(`DROP TABLE "recipes"`);
    await queryRunner.query(`DROP TYPE "public"."recipe_status"`);
    await queryRunner.query(`DROP TABLE "recipe_steps"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
