/*
  Warnings:

  - You are about to drop the column `State` on the `Properties` table. All the data in the column will be lost.
  - Added the required column `state` to the `Properties` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Properties" DROP COLUMN "State",
ADD COLUMN     "state" TEXT NOT NULL;
