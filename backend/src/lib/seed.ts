const { getUsers } = require("./src/lib/auth");

async function seed() {
  const users = await getUsers();
  console.log(`Seeded ${users.length} users:`);
  users.forEach((u: any) => console.log(`  - ${u.email} (${u.role}/${u.tenant})`));
}

seed().catch(console.error);
