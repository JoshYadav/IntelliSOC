const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const defaultPlaybooks = [
    { name: 'Network Isolation',       description: 'Block IP and isolate affected hosts at the firewall level', trigger: 'CONTAINMENT', steps: '[]' },
    { name: 'Credential Reset',        description: 'Force password reset for all compromised user accounts', trigger: 'REMEDIATION', steps: '[]' },
    { name: 'Host Quarantine',         description: 'Quarantine compromised endpoint and collect forensic artifacts', trigger: 'CONTAINMENT', steps: '[]' },
    { name: 'Threat Intel Lookup',     description: 'Enrich indicators of compromise with threat intelligence feeds', trigger: 'INVESTIGATION', steps: '[]' },
    { name: 'Full Incident Response',  description: 'End-to-end incident response: contain, eradicate, recover', trigger: 'FULL_RESPONSE', steps: '[]' },
  ];

  for (const pb of defaultPlaybooks) {
    const existing = await prisma.playbook.findFirst({ where: { name: pb.name } });
    if (!existing) {
      await prisma.playbook.create({ data: pb });
      console.log('Created:', pb.name);
    } else {
      console.log('Exists:', pb.name);
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
