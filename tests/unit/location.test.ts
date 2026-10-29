import { LocationService } from '../../src/services/location.service';

export async function runLocationTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${testName}`);
    } else {
      failed++;
      console.error(`  ✗ ${testName}`);
    }
  }

  console.log('\n--- STARTING LOCATION SERVICE TESTS ---');
  const zeroDist = LocationService.calculateDistanceMeters(28.6139, 77.2090, 28.6139, 77.2090);
  assert(zeroDist === 0, 'calculates 0 distance for identical coordinates');

  const delhiMumbai = LocationService.calculateDistanceMeters(28.6139, 77.2090, 19.0760, 72.8777);
  assert(delhiMumbai > 1000000 && delhiMumbai < 1300000, 'calculates accurate distance between known coordinates (Delhi to Mumbai)');

  console.log(`\n--- LOCATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  return { passed, failed };
}

export default runLocationTests;

runLocationTests().then((res) => {
  if (res.failed > 0) process.exit(1);
  process.exit(0);
});
