import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.session.findMany({
    include: { logs: true, alerts: true },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${sessions.length} sessions.`);
  if (sessions.length > 0) {
    const latest = sessions[0];
    console.log(`Latest session file: ${latest.fileName}`);
    console.log(`Logs in latest session: ${latest.logs.length}`);
    console.log(`Alerts in latest session: ${latest.alerts.length}`);
    
    if (latest.alerts.length === 0) {
      console.log("Logs content:");
      latest.logs.slice(0, 5).forEach(l => console.log(l.rawLog));
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
