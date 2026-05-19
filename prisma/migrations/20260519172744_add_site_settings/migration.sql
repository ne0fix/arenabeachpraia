-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "whatsappNumber" TEXT NOT NULL DEFAULT '5511999999999',
    "phone" TEXT NOT NULL DEFAULT '(11) 99999-9999',
    "email" TEXT NOT NULL DEFAULT 'contato@arenabeachserra.com.br',
    "address" TEXT NOT NULL DEFAULT 'Av. Beira Mar, 1234 — Serra, ES',
    "hoursWeekdays" TEXT NOT NULL DEFAULT 'Seg–Sex: 6h–22h',
    "hoursSaturday" TEXT NOT NULL DEFAULT 'Sábado: 6h–23h',
    "hoursSunday" TEXT NOT NULL DEFAULT 'Domingo: 6h–21h',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);
