-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN     "msgContact" TEXT NOT NULL DEFAULT 'Olá! Gostaria de mais informações sobre a Arena Beach Serra.',
ADD COLUMN     "msgExclusive" TEXT NOT NULL DEFAULT 'Olá! Tenho interesse em agendar o espaço exclusivo "{nome}". Poderia me passar mais informações?',
ADD COLUMN     "msgSupport" TEXT NOT NULL DEFAULT 'Olá! Preciso de suporte com meu agendamento.';
