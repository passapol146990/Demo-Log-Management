import { ensureSeeded, listUsersInTenant } from "./users";

async function seed() {
  await ensureSeeded();
  const users = [...(await listUsersInTenant("demoA")), ...(await listUsersInTenant("demoB"))];
  console.log(`Seeded ${users.length} users:`);
  users.forEach((u) => console.log(`  - ${u.email} (${u.role}/${u.tenant})`));
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
