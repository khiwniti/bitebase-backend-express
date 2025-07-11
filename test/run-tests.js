// This is a very basic test runner.
// For a real project, use a dedicated test runner like Mocha, Jest, or Ava.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const testDir = __dirname; // Should be 'test' directory

async function runAllTests() {
  console.log('Starting basic test execution...\n');
  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.test.js'))
    .map(file => path.join(testDir, file));

  let filesRun = 0;
  let filesFailed = 0;

  if (testFiles.length === 0) {
    console.log('No test files found ending with .test.js in the test directory.');
    return;
  }

  // Try to find Mocha globally or locally if possible, otherwise just run with node
  // This is a heuristic and might not always work.
  let mochaPath = null;
  try {
    mochaPath = execSync('npm bin', { encoding: 'utf-8' }).trim() + '/mocha';
    if (!fs.existsSync(mochaPath)) mochaPath = 'mocha'; // Try global mocha
  } catch (e) {
    mochaPath = 'mocha'; // Default to global mocha if 'npm bin' fails
  }

  // Check if mocha is available
  let mochaAvailable = false;
  try {
    execSync(`${mochaPath} --version`, { stdio: 'ignore' });
    mochaAvailable = true;
    console.log(`Using Mocha test runner found at: ${mochaPath}\n`);
  } catch (e) {
    console.log('Mocha not found or not executable. Test files contain describe/it blocks that Mocha would run.');
    console.log('You can install Mocha globally (`npm install -g mocha`) or locally (`npm install --save-dev mocha`).');
    console.log('Then run tests with `npx mocha test/**/*.test.js` or configure npm test script.\n');
    // Fallback or just instruction? For now, just instruct.
  }

  if (mochaAvailable) {
    for (const file of testFiles) {
      console.log(`Running with Mocha: ${path.basename(file)}`);
      filesRun++;
      try {
        // Execute mocha for each file. Redirect stdio to inherit to see output.
        execSync(`${mochaPath} "${file}"`, { stdio: 'inherit' });
        console.log(`Mocha execution completed for: ${path.basename(file)}\n`);
      } catch (error) {
        // Mocha itself will output failure details. execSync throws if the command returns non-zero.
        console.error(`Mocha execution failed or tests failed in: ${path.basename(file)}\n`);
        filesFailed++; // Increment if Mocha exits with an error (typically meaning test failures)
      }
    }
  } else {
      console.log("Skipping Mocha execution as it's not available.");
      console.log("The test files are structured for Mocha/Jest. Please install a test runner.");
  }


  console.log('\n--- Basic Test Execution Summary ---');
  if (mochaAvailable) {
    console.log(`Test files processed by Mocha: ${filesRun}`);
    if (filesFailed > 0) {
        console.log(`Files with failing tests (according to Mocha's exit code): ${filesFailed}`);
        console.log('Please review Mocha output above for specific test failures.');
        process.exitCode = 1; // Indicate failure
    } else {
        console.log('All processed files passed (according to Mocha\'s exit code).');
    }
  } else {
    console.log('Mocha was not available. Test file execution was skipped.');
    console.log('Please install Mocha or Jest and run tests using them.');
    process.exitCode = 1; // Indicate that tests couldn't really run
  }
}

runAllTests();
