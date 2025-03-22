/*
  Warnings:

  - A unique constraint covering the columns `[txId]` on the table `Payout` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `txId` to the `Payout` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "txId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payout_txId_key" ON "Payout"("txId");
