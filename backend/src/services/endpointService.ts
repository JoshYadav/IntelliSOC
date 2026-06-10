import prisma from '../utils/prisma';

// ── Register or update endpoint on first contact ─────────────────────────────
export async function upsertEndpoint(
  hostname: string,
  ip?: string,
  os?: string,
  agentVersion?: string
) {
  return prisma.endpoint.upsert({
    where: { hostname },
    update: {
      ip: ip ?? undefined,
      os: os ?? undefined,
      agentVersion: agentVersion ?? undefined,
      status: 'ONLINE',
      lastSeen: new Date(),
    },
    create: {
      hostname,
      ip: ip ?? null,
      os: os ?? null,
      agentVersion: agentVersion ?? null,
      status: 'ONLINE',
      lastSeen: new Date(),
    },
  });
}

// ── Heartbeat — update lastSeen + status ─────────────────────────────────────
export async function heartbeat(hostname: string) {
  const endpoint = await prisma.endpoint.findUnique({ where: { hostname } });
  if (!endpoint) return null;

  // Don't change status if ISOLATED (admin action overrides heartbeat)
  const newStatus = endpoint.status === 'ISOLATED' ? 'ISOLATED' : 'ONLINE';

  return prisma.endpoint.update({
    where: { hostname },
    data: { lastSeen: new Date(), status: newStatus },
  });
}

// ── List all endpoints with stats ────────────────────────────────────────────
export async function listEndpoints() {
  const endpoints = await prisma.endpoint.findMany({
    orderBy: { lastSeen: 'desc' },
    include: {
      _count: {
        select: { telemetry: true },
      },
    },
  });

  // For each endpoint, count alerts that reference the endpoint hostname as IP
  // (EDR alerts use hostname as identifier)
  const enriched = await Promise.all(
    endpoints.map(async (ep) => {
      const alertCount = await prisma.alert.count({
        where: { ip: ep.hostname },
      });
      return { ...ep, alertCount };
    })
  );

  return enriched;
}

// ── Get endpoint detail ──────────────────────────────────────────────────────
export async function getEndpoint(id: string) {
  return prisma.endpoint.findUnique({
    where: { id },
    include: {
      _count: {
        select: { telemetry: true },
      },
    },
  });
}

// ── Isolate / Un-isolate ─────────────────────────────────────────────────────
export async function isolateEndpoint(id: string) {
  return prisma.endpoint.update({
    where: { id },
    data: { status: 'ISOLATED' },
  });
}

export async function unisolateEndpoint(id: string) {
  return prisma.endpoint.update({
    where: { id },
    data: { status: 'ONLINE', lastSeen: new Date() },
  });
}

// ── Store telemetry ──────────────────────────────────────────────────────────
export async function storeTelemetry(
  endpointId: string,
  type: string,
  data: unknown
) {
  return prisma.endpointTelemetry.create({
    data: {
      endpointId,
      type,
      data: JSON.stringify(data),
    },
  });
}

// ── Get latest telemetry by type ─────────────────────────────────────────────
export async function getLatestTelemetry(
  endpointId: string,
  type: string,
  limit = 50
) {
  return prisma.endpointTelemetry.findMany({
    where: { endpointId, type },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}

// ── Get alerts for an endpoint (by hostname) ─────────────────────────────────
export async function getEndpointAlerts(endpointId: string) {
  // First get the hostname for this endpoint
  const endpoint = await prisma.endpoint.findUnique({
    where: { id: endpointId },
  });
  if (!endpoint) return [];

  return prisma.alert.findMany({
    where: { ip: endpoint.hostname },
    orderBy: { timestamp: 'desc' },
  });
}

// ── Mark stale endpoints as OFFLINE ──────────────────────────────────────────
// Called periodically — any endpoint not seen in 5 minutes goes OFFLINE
export async function markStaleEndpoints(staleThresholdMs = 5 * 60 * 1000) {
  const threshold = new Date(Date.now() - staleThresholdMs);
  await prisma.endpoint.updateMany({
    where: {
      lastSeen: { lt: threshold },
      status: 'ONLINE', // don't touch ISOLATED endpoints
    },
    data: { status: 'OFFLINE' },
  });
}
