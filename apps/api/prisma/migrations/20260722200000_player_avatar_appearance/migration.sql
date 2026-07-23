-- Aparência visual do Explorador. Nullable preserva contas existentes; clientes normalizam o padrão.
ALTER TABLE "Profile" ADD COLUMN "avatarAppearance" JSONB;

