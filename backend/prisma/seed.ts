import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const playbooks = [
    { name: 'Network Isolation', trigger: 'CONTAINMENT', description: 'Block IP and isolate affected hosts', steps: JSON.stringify(['Block source IP at firewall', 'Isolate endpoint via EDR', 'Notify SOC team']) },
    { name: 'Credential Reset', trigger: 'REMEDIATION', description: 'Force password reset for compromised accounts', steps: JSON.stringify(['Identify affected accounts', 'Force password reset', 'Revoke active sessions', 'Enable MFA']) },
    { name: 'Host Quarantine', trigger: 'CONTAINMENT', description: 'Quarantine compromised endpoint', steps: JSON.stringify(['Isolate host from network', 'Capture memory dump', 'Collect forensic artifacts']) },
    { name: 'Threat Intel Lookup', trigger: 'INVESTIGATION', description: 'Enrich IOCs with threat intelligence', steps: JSON.stringify(['Query VirusTotal', 'Check AbuseIPDB', 'Search MISP feeds']) },
    { name: 'Full Incident Response', trigger: 'FULL_RESPONSE', description: 'End-to-end incident response workflow', steps: JSON.stringify(['Triage alert', 'Contain threat', 'Eradicate malware', 'Recover systems', 'Document findings']) },
  ];

  for (const pb of playbooks) {
    const existing = await prisma.playbook.findFirst({ where: { name: pb.name } });
    if (existing) {
      await prisma.playbook.update({
        where: { id: existing.id },
        data: pb,
      });
    } else {
      await prisma.playbook.create({
        data: pb,
      });
    }
  }
  console.log('Seeded default playbooks');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
