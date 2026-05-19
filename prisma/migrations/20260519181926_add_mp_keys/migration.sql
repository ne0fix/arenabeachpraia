-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN     "mpAccessToken" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "mpPublicKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "mpWebhookSecret" TEXT NOT NULL DEFAULT '';
