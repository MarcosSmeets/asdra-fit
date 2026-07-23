import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEntry {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  constructor(private readonly prisma: PrismaService) {}

  /** Registra um evento de auditoria. Nunca lança — auditoria não bloqueia o fluxo. */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          entityType: entry.entityType ?? null,
          entityId: entry.entityId ?? null,
          metadata: (entry.metadata ?? undefined) as never,
          correlationId: entry.correlationId ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(`Falha ao gravar auditoria (${entry.action}): ${String(error)}`);
    }
  }
}
