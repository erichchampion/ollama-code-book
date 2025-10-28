// Bad: Resources leak
async function main() {
  const app = await bootstrap();
  await app.run();
  // Container never disposed - leaks!
}