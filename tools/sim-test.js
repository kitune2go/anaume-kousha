// Fast-forwards each stage under a few play styles and prints the outcome.
// The simulation uses a fixed 0.05 s step and a per-stage seed, so results are reproducible.
//   npm install && python3 tools/build.py --test && node tools/sim-test.js
// Set CHROMIUM_SPARTICUZ=1 to use @sparticuz/chromium instead of Playwright's own browser.
const path = require('path');
const STRATEGIES = {
  0: ['auto', 'fill', 'carry', 'carry+late'],
  1: ['auto', 'zones', 'zones+reg', 'zones+reg+carry'],
};
async function launch() {
  if (process.env.CHROMIUM_SPARTICUZ) {
    const sp = require('@sparticuz/chromium'); const { chromium } = require('playwright-core');
    return chromium.launch({ executablePath: await sp.executablePath(), args: [...sp.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'], headless: true });
  }
  const { chromium } = require('playwright');
  return chromium.launch({ args: ['--allow-file-access-from-files'], headless: true });
}
async function run(stage, scen) {
  const b = await launch(); const p = await b.newPage({ viewport: { width: 400, height: 300 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../dist/anaume.test.html'));
  await p.waitForFunction(() => document.getElementById('loadNote').hidden, { timeout: 60000 });
  await p.evaluate(st => __start(st), stage); await p.click('#pauseBtn');
  await p.evaluate(scen => {
    const d = __dbg();
    if (scen.includes('zones')) d.plots.forEach(pl => pl.cells.forEach(c => { c.zone = 1; c.dirty = true; }));
    if (scen.includes('reg')) __reg();
    if (scen.includes('fill')) document.getElementById('buyFill').click();
    if (scen.includes('carry')) document.getElementById('buyCarry').click();
  }, scen);
  let r;
  for (let k = 0; k < 14; k++) {
    if (k === 1 && scen.includes('late')) await p.evaluate(() => document.getElementById('buyFill').click());
    r = await p.evaluate(() => { __ff(60); const d = __dbg(), S = d.S;
      return { t: Math.round(S.t), houses: S.houses, redigs: S.redigs, roadEnd: Math.round(S.road * 100), roadAvg: Math.round(S.roadSum / Math.max(1, S.roadSamples) * 100),
               waste: +S.waste.toFixed(1), soilError: +d.err.toFixed(4), cleared: !!S.cleared, ended: S.ended }; });
    if (r.ended) break;
  }
  await b.close();
  return { stage: stage + 1, scen, ...r, errors: errs.length };
}
(async () => {
  const rows = [];
  for (const [st, list] of Object.entries(STRATEGIES)) for (const sc of list) rows.push(await run(+st, sc));
  console.table(rows);
  if (rows.some(r => r.errors || Math.abs(r.soilError) > 0.001)) process.exitCode = 1;
})();
