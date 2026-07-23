-- Habilidades equipadas do Adari (máx 4; vazio = conjunto padrão do nível).
ALTER TABLE "UserCreature" ADD COLUMN     "equippedAbilities" TEXT[] DEFAULT ARRAY[]::TEXT[];
