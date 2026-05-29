const fs = require('fs');
const path = require('path');

class JsonReporter {
  constructor(options = {}) {
    this.outputFile = options.outputFile || 'verification/results/ui-playwright.json';
  }

  onBegin() {
    this.tests = [];
  }

  onTestEnd(test, result) {
    this.tests.push({
      name: test.title,
      pass: result.status === 'passed',
      duration: result.duration,
    });
  }

  onEnd() {
    const pass = this.tests.filter((t) => t.pass).length;
    const out = {
      pass,
      total: this.tests.length,
      tests: this.tests,
    };
    const p = path.join(process.cwd(), this.outputFile);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(out, null, 2));
  }
}

module.exports = JsonReporter;
