/*
  Warnings:

  - You are about to drop the `ingredient_variants` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ingredient_variants" DROP CONSTRAINT "ingredient_variants_ingredient_id_fkey";

-- DropForeignKey
ALTER TABLE "ingredient_variants" DROP CONSTRAINT "ingredient_variants_workspace_id_fkey";

-- DropTable
DROP TABLE "ingredient_variants";

-- CreateTable
CREATE TABLE "ingredient_variants" (
    "id" UUID NOT NULL,
    "variant" TEXT NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,

    CONSTRAINT "ingredient_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_variants_workspace_id_variant_key" ON "ingredient_variants"("workspace_id", "variant");

-- AddForeignKey
ALTER TABLE "ingredient_variants" ADD CONSTRAINT "ingredient_variants_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_variants" ADD CONSTRAINT "ingredient_variants_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
