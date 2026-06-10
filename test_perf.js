const incidents = Array(1000000).fill(0).map(() => ({
  severity: ['critical', 'warning', 'info'][Math.floor(Math.random() * 3)]
}));

console.time('original');
for (let i = 0; i < 100; i++) {
  const criticalCount = incidents.filter(i => i.severity === 'critical').length;
  const warningCount = incidents.filter(i => i.severity === 'warning').length;
  const infoCount = incidents.filter(i => i.severity === 'info').length;
  const totalCount = incidents.length;
}
console.timeEnd('original');

console.time('optimized_reduce');
for (let i = 0; i < 100; i++) {
  const counts = incidents.reduce(
    (acc, cur) => {
      if (cur.severity === 'critical') acc.criticalCount++;
      else if (cur.severity === 'warning') acc.warningCount++;
      else if (cur.severity === 'info') acc.infoCount++;
      return acc;
    },
    { criticalCount: 0, warningCount: 0, infoCount: 0 }
  );
  const { criticalCount, warningCount, infoCount } = counts;
  const totalCount = incidents.length;
}
console.timeEnd('optimized_reduce');

console.time('optimized_for_loop');
for (let i = 0; i < 100; i++) {
  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  for (let j = 0; j < incidents.length; j++) {
    const sev = incidents[j].severity;
    if (sev === 'critical') criticalCount++;
    else if (sev === 'warning') warningCount++;
    else if (sev === 'info') infoCount++;
  }
  const totalCount = incidents.length;
}
console.timeEnd('optimized_for_loop');
