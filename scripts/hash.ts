import { hashPassword } from '../src/lib/passwords';

async function main() {
  const hash = await hashPassword('password123');
  console.log(hash);
}

main().catch(console.error);
